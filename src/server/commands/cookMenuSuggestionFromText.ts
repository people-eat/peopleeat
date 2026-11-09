import { generateText, Output } from 'ai';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMenuSuggestionDraft,
    GqlSCookMenuSuggestionDraftCourse,
    GqlSCookMenuSuggestionDraftMealOption,
    GqlSCookMutation,
    GqlSCookMutationMenuSuggestionFromTextArgs,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';
import { cookMenuSuggestionFileContentsLoad } from '../utils/cookMenuSuggestionFileContentsLoad';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

const MENU_SUGGESTION_SCHEMA = z.object({
    title: z.string().min(1),
    description: z.string(),
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
Du bist ein Agent der Privatköchen dabei hilft, strukturierte Menüs aus Notizen oder Dokumenten abzuleiten um sie in einer Datenbank zu speichern.
Die Gänge von Menüs können mehrere Gerichtsoptionen beinhalten, sodass Kunden eine Auswahl treffen können. Nur ein Gericht ist allerdings auch erlaubt.
Im System haben Köche bereits Gerichte hinterlegt. Verwende diese wieder, indem du deren id verwendest, falls möglich und sinnvoll.
Falls es noch kein passendes Gericht für etwas aus den Notizen oder dem Dokument gibt, kannst du auch neue anlegen lassen.
Wenn der Koch ein Dokument oder ausführliche Notizen liefert, folge deren Gangstruktur.
Wenn der Koch nur eine kurze Vorgabe ohne Dokument liefert, stelle ein ausgewogenes Menü aus dem Inventar zusammen.
Für mealOptions: Wenn type=EXISTING_MEAL, setze mealId und title/description auf null. Wenn type=NEW_MEAL, setze title/description und mealId auf null.
Aus keinem Titel und keiner Beschreibung darf hervorgehen auf welche technische Weise das Menü erstellt wurde.
Verwende als Gangnamen niemals den Namen der Gerichte im Gang, sondern weiche bspw. auf Amuse Bouche, Vorspeise, Hauptspeise, Dessert oder Zwischengang aus.
Schreibe Titel und Beschreibung in derselben Sprache wie die Notizen bzw. das Dokument. Ist die Sprache unklar, schreibe auf Deutsch.
`.trim();

function draftFromModelOutput(
    output: z.infer<typeof MENU_SUGGESTION_SCHEMA>,
    existingMealIds: ReadonlySet<string>,
): GqlSCookMenuSuggestionDraft {
    const courses: GqlSCookMenuSuggestionDraftCourse[] = [];

    for (const course of output.courses) {
        const mealOptions: GqlSCookMenuSuggestionDraftMealOption[] = [];

        for (const meal of course.mealOptions) {
            if (meal.type === 'EXISTING_MEAL' && meal.mealId && existingMealIds.has(meal.mealId)) {
                mealOptions.push({
                    type: 'EXISTING_MEAL',
                    mealId: meal.mealId,
                    title: null,
                    description: null,
                });
            } else if (meal.type === 'NEW_MEAL' && meal.title && meal.description) {
                mealOptions.push({
                    type: 'NEW_MEAL',
                    mealId: null,
                    title: textNormalizeTitled(meal.title),
                    description: textNormalizeProseTitled(meal.description),
                });
            }
        }

        courses.push({
            title: textNormalizeTitled(course.title),
            mealOptions,
        });
    }

    return {
        title: textNormalizeTitled(output.title),
        description: textNormalizeProseTitled(output.description),
        courses,
    };
}

/** AI: structured menu from notes and/or files. Does not insert meals or menus. */
export async function cookMenuSuggestionFromText(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMenuSuggestionFromTextArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenuSuggestionDraft> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);

    try {
        const enabled = await featureToggleIsEnabled('AI_MENU_CREATE', serverRuntime, cookId);
        if (!enabled) {
            throw new Error('cookMenuSuggestionFromText: AI_MENU_CREATE is disabled');
        }

        const notes = args.text?.trim() ?? '';
        const fileUploadIds = args.fileUploadIds ?? [];
        const fileContents = await cookMenuSuggestionFileContentsLoad(cookId, fileUploadIds, serverRuntime);
        const documentText = [...fileContents.extractedTextParts, notes].filter((part) => part.length > 0).join('\n\n');

        if (documentText.length === 0 && fileContents.fileParts.length === 0) {
            throw new Error('cookMenuSuggestionFromText: text or files required');
        }

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

        const promptSections = ['Existierende Gerichte des Kochs:', mealBulletPointList || '(keine)'];
        if (documentText.length > 0) {
            promptSections.push('', 'Notizen oder extrahierter Text:', documentText);
        }
        if (fileContents.fileParts.length > 0) {
            promptSections.push('', 'Angehängte Dateien (Bilder oder PDF) folgen als Dateiteile.');
        }
        const prompt = promptSections.join('\n');
        const promptForLedger = [prompt, ...fileContents.promptPlaceholders].join('\n');

        const result = await generateText({
            model: serverRuntime.ai.cookMenuSuggestionModel(),
            instructions: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: [{ type: 'text', text: prompt }, ...fileContents.fileParts],
                },
            ],
            output: Output.object({ schema: MENU_SUGGESTION_SCHEMA }),
            telemetry: aiTelemetry('COOK_MENU_SUGGESTION_FROM_TEXT'),
        });

        serverRuntime.aiGenerations.record({
            kind: 'COOK_MENU_SUGGESTION_FROM_TEXT',
            userId: cookId,
            sessionId: requestingSession.sessionId,
            system: SYSTEM_PROMPT,
            prompt: promptForLedger,
            output: aiGenerationOutputSerialize(result.output),
            ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
        });

        return draftFromModelOutput(result.output, existingMealIds);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
