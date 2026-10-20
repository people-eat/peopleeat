import { generateText, Output } from 'ai';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { capitalizeFirstLetter } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { MealCreate } from '../db/schema';
import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMenuCourseSuggestion,
    GqlSCookMenuSuggestion,
    GqlSCookMutation,
    GqlSCookMutationMenuSuggestionFromTextArgs,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const MENU_SUGGESTION_SCHEMA = z.object({
    title: z.string().min(1),
    courses: z.array(
        z.object({
            title: z.string().min(1),
            mealOptions: z.array(
                z.object({
                    type: z.enum(['EXISTING_MEAL', 'NEW_MEAL']),
                    mealId: z.string().nullable(),
                    title: z.string().nullable(),
                    description: z.string().nullable(),
                }),
            ),
        }),
    ),
});

const SYSTEM_PROMPT = `
Du bist ein Agent der Privatköchen dabei hilft, strukturierte Menüs aus Textdokumenten abzuleiten um sie in einer Datenbank zu speichern.
Die Gänge von Menüs können mehrere Gerichtsoptionen beinhalten, sodass Kunden eine Auswahl treffen können. Nur ein Gericht ist allerdings auch erlaubt.
Im System haben Köche bereits Gerichte hinterlegt. Verwende diese wieder, indem du deren id verwendest - falls möglich und sinnvoll.
Falls es noch kein passendes Gericht für etwas aus dem Textdokument gibt, kannst du auch neue anlegen lassen.
Für mealOptions: Wenn type=EXISTING_MEAL, setze mealId und title/description auf null. Wenn type=NEW_MEAL, setze title/description und mealId auf null.
Aus keinem Titel und keiner Beschreibung darf hervorgehen auf welche technische Weise das Menü erstellt wurde (kein aus Textdokument).
Verwende als Gangnamen niemals den Namen der Gerichte im Gang, sondern weiche bspw. auf Amuse Bouche, Vorspeise, Hauptspeise, Dessert oder Zwischengang aus.
`.trim();

export async function cookMenuSuggestionFromText(
    { cookId }: GqlSCookMutation,
    { text }: GqlSCookMutationMenuSuggestionFromTextArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenuSuggestion> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const cookMeals = await serverRuntime.db
            .select({
                mealId: meals.mealId,
                title: meals.title,
                description: meals.description,
            })
            .from(meals)
            .where(and(eq(meals.cookId, cookId), isNull(meals.deletedAt)));

        const existingMealIds = new Set(cookMeals.map((meal) => meal.mealId));

        const mealBulletPointList = cookMeals
            .map(({ mealId, title, description }) => `-Id:"${mealId}",Name:"${title}",Beschreibung:"${description || 'Keine'}"`)
            .join('\n');

        const prompt = ['Existierende Gerichte des Kochs:', '\n', mealBulletPointList, '\n\n', 'Menü in Textform:', '\n', text].join('');

        const result = await generateText({
            model: serverRuntime.ai.cookMenuSuggestionModel(),
            instructions: SYSTEM_PROMPT,
            prompt,
            output: Output.object({ schema: MENU_SUGGESTION_SCHEMA }),
            telemetry: aiTelemetry('COOK_MENU_SUGGESTION_FROM_TEXT'),
        });

        serverRuntime.aiGenerations.record({
            kind: 'COOK_MENU_SUGGESTION_FROM_TEXT',
            userId: cookId,
            sessionId: requestingSession.sessionId,
            system: SYSTEM_PROMPT,
            prompt,
            output: aiGenerationOutputSerialize(result.output),
            ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
        });

        // Phase 1 — Payload construction (new draft meals only)
        const mealInserts: MealCreate[] = [];
        const courses: GqlSCookMenuCourseSuggestion[] = [];

        for (const course of result.output.courses) {
            const mealIds: string[] = [];

            for (const meal of course.mealOptions) {
                if (meal.type === 'EXISTING_MEAL' && meal.mealId && existingMealIds.has(meal.mealId)) {
                    mealIds.push(meal.mealId);
                } else if (meal.type === 'NEW_MEAL' && meal.title && meal.description) {
                    const mealId = idCreate();
                    mealInserts.push({
                        mealId,
                        cookId,
                        title: capitalizeFirstLetter(meal.title.trim()),
                        description: capitalizeFirstLetter(meal.description.trim()),
                        publishedAt: null,
                        deletedAt: null,
                    });
                    mealIds.push(mealId);
                }
            }

            courses.push({
                title: capitalizeFirstLetter(course.title.trim()),
                mealIds,
            });
        }

        // Phase 2 — Single multi-row insert (atomic) when new drafts exist
        if (mealInserts.length > 0) {
            await serverRuntime.db.insert(meals).values(mealInserts);
            await serverRuntime.publish.userUpdates({ userId: cookId });
        }

        return {
            title: capitalizeFirstLetter(result.output.title.trim()),
            description: '',
            courses,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
