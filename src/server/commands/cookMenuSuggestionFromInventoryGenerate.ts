import { generateText, Output } from 'ai';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';
import type { CookMenuSuggestionDraft } from '../utils/cookMenuSuggestionDraftMaterialize';

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
Du bist ein Agent der Privatköchen dabei hilft, ein neues Menü aus ihrem bestehenden Gerichtsinventar zusammenzustellen.
Die Gänge von Menüs können mehrere Gerichtsoptionen beinhalten, sodass Kunden eine Auswahl treffen können. Nur ein Gericht ist allerdings auch erlaubt.
Bevorzuge vorhandene Gerichte des Kochs (EXISTING_MEAL mit mealId). Lege NEW_MEAL nur an, wenn für den Anlass wirklich kein passendes Gericht existiert.
Für mealOptions: Wenn type=EXISTING_MEAL, setze mealId und title/description auf null. Wenn type=NEW_MEAL, setze title/description und mealId auf null.
Aus keinem Titel und keiner Beschreibung darf hervorgehen, dass das Menü von einer KI erzeugt wurde.
Verwende als Gangnamen niemals den Namen der Gerichte im Gang, sondern weiche bspw. auf Amuse Bouche, Vorspeise, Hauptspeise, Dessert oder Zwischengang aus.
Schreibe Titel und Beschreibung in derselben Sprache wie die Anfrage bzw. den Brief. Ist die Sprache unklar, schreibe auf Deutsch.
`.trim();

export type CookMenuSuggestionFromInventoryGenerateInput = {
    cookId: string;
    /** Optional free-text brief (menu-create path). */
    brief?: string | null;
    /** Preformatted booking-request context (pool evaluation path). */
    bookingRequestContext?: string | null;
    requestingSession: GqlSSession | null;
    serverRuntime: ServerRuntime;
};

/** One-shot inventory menu assembly. Returns a draft (no meal inserts). */
export async function cookMenuSuggestionFromInventoryGenerate(
    input: CookMenuSuggestionFromInventoryGenerateInput,
): Promise<CookMenuSuggestionDraft | null> {
    const { cookId, brief, bookingRequestContext, requestingSession, serverRuntime } = input;

    const cookMeals = await serverRuntime.db
        .select({
            mealId: meals.mealId,
            title: meals.title,
            description: meals.description,
        })
        .from(meals)
        .where(and(eq(meals.cookId, cookId), isNull(meals.deletedAt)));

    if (cookMeals.length === 0) {
        return null;
    }

    const mealBulletPointList = cookMeals
        .map(({ mealId, title, description }) => `-Id:"${mealId}",Name:"${title}",Beschreibung:"${description || 'Keine'}"`)
        .join('\n');

    const contextParts: string[] = ['Existierende Gerichte des Kochs:', mealBulletPointList];
    if (bookingRequestContext != null && bookingRequestContext.trim().length > 0) {
        contextParts.push('', 'Buchungsanfrage:', bookingRequestContext.trim());
    }
    if (brief != null && brief.trim().length > 0) {
        contextParts.push('', 'Kurze Vorgabe des Kochs:', brief.trim());
    }
    if (contextParts.length === 2) {
        contextParts.push('', 'Stelle ein ausgewogenes Menü aus dem Inventar zusammen.');
    }

    const prompt = contextParts.join('\n');

    const result = await generateText({
        model: serverRuntime.ai.cookMenuSuggestionFromInventoryModel(),
        instructions: SYSTEM_PROMPT,
        prompt,
        output: Output.object({ schema: MENU_SUGGESTION_SCHEMA }),
        telemetry: aiTelemetry('COOK_MENU_SUGGESTION_FROM_INVENTORY'),
    });

    serverRuntime.aiGenerations.record({
        kind: 'COOK_MENU_SUGGESTION_FROM_INVENTORY',
        userId: cookId,
        sessionId: requestingSession?.sessionId,
        system: SYSTEM_PROMPT,
        prompt,
        output: aiGenerationOutputSerialize(result.output),
        ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
    });

    return {
        title: result.output.title,
        description: result.output.description,
        courses: result.output.courses,
    };
}
