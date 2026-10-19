import { generateText, Output } from 'ai';
import { z } from 'zod';

import type { BookingRequestCookMenuEvaluation } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const EVALUATION_SCHEMA = z.object({
    evaluationSummary: z.string(),
    menus: z.array(
        z.object({
            menuId: z.string(),
            evaluationSummary: z.string(),
            isSuitable: z.boolean(),
        }),
    ),
});

const SYSTEM_PROMPT = `
Du bist ein Agent der Privatköchen dabei hilft, Menüs bei der Angebotserstellung für Buchungsanfragen von Kunden zu bewerten und auszuwählen.
Die Gänge von Menüs können mehrere Gerichtsoptionen beinhalten, sodass Kunden eine Auswahl treffen können. Nur ein Gericht ist allerdings auch erlaubt.
Bewerte die bestehenden Menüs entweder als geeignet oder ungeeignet.
Fasse deine Erkenntnisse und Bewertung in der evaluationSummary pro Menü kurz zusammen und verwende die übergeordnete evaluationSummary für eine kurze Nachricht, die dem Koch in einem Message Banner angezeigt wird.
Falls keines der Menüs geeignet scheint, informiere den Koch darüber und fordere ihn höflich dazu auf, doch ein zur Anfrage passendes Menü neu zusammenzustellen oder ein bestehendes entsprechend umzubauen.
Schreibe in derselben Sprache wie die Anfrage. Ist die Sprache unklar, schreibe auf Deutsch.
`.trim();

type CookBookingRequestMenuEvaluationGenerateInput = {
    cookId: string;
    bookingRequestContext: string;
    menus: {
        menuId: string;
        title: string;
        description: string;
        courses: {
            title: string;
            mealOptions: { title: string; description: string }[];
        }[];
    }[];
    requestingSession: GqlSSession | null;
    serverRuntime: ServerRuntime;
};

/** One-shot ranking of cook inventory menus against a booking request. */
export async function cookBookingRequestMenuEvaluationGenerate(
    input: CookBookingRequestMenuEvaluationGenerateInput,
): Promise<Omit<BookingRequestCookMenuEvaluation, 'generatedMenu'>> {
    const { cookId, bookingRequestContext, menus, requestingSession, serverRuntime } = input;

    if (menus.length === 0) {
        return {
            evaluationSummary: 'Du hast noch keine Menüs. Stelle eines aus deinen Gerichten zusammen, das zur Anfrage passt.',
            menus: [],
        };
    }

    const menusText = menus
        .map((menu) =>
            [
                `## Menü "${menu.title}" (id: ${menu.menuId})`,
                menu.description.trim().length > 0 ? `Beschreibung: ${menu.description}` : '',
                ...menu.courses.map((course) =>
                    [
                        `### Gang "${course.title}"`,
                        ...course.mealOptions.map((meal) => `-Name:"${meal.title}",Beschreibung:"${meal.description || 'Keine'}"`),
                    ].join('\n'),
                ),
            ]
                .filter((line) => line.length > 0)
                .join('\n'),
        )
        .join('\n\n');

    const prompt = [bookingRequestContext, menusText].join('\n\n\n');

    const result = await generateText({
        model: serverRuntime.ai.cookMenuEvaluationModel(),
        system: SYSTEM_PROMPT,
        prompt,
        output: Output.object({ schema: EVALUATION_SCHEMA }),
        telemetry: aiTelemetry('BOOKING_REQUEST_COOK_MENU_EVALUATION'),
    });

    serverRuntime.aiGenerations.record({
        kind: 'BOOKING_REQUEST_COOK_MENU_EVALUATION',
        userId: cookId,
        sessionId: requestingSession?.sessionId,
        system: SYSTEM_PROMPT,
        prompt,
        output: aiGenerationOutputSerialize(result.output),
        ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
    });

    const knownMenuIds = new Set(menus.map((menu) => menu.menuId));
    return {
        evaluationSummary: result.output.evaluationSummary,
        menus: result.output.menus.filter((menu) => knownMenuIds.has(menu.menuId)),
    };
}
