import { generateText, Output } from 'ai';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMenuSuggestion,
    GqlSCookMutation,
    GqlSCookMutationMenuTitleDescriptionSuggestArgs,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const TITLE_DESCRIPTION_SCHEMA = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
});

export async function cookMenuTitleDescriptionSuggest(
    { cookId }: GqlSCookMutation,
    { currentTitle, currentDescription, courses }: GqlSCookMutationMenuTitleDescriptionSuggestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenuSuggestion> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const mealIds = [...new Set(courses.flatMap((course) => course.mealIds))];
        const mealRows =
            mealIds.length === 0
                ? []
                : await serverRuntime.db
                      .select({
                          mealId: meals.mealId,
                          title: meals.title,
                          description: meals.description,
                      })
                      .from(meals)
                      .where(and(eq(meals.cookId, cookId), inArray(meals.mealId, mealIds), isNull(meals.deletedAt)));

        const mealsById = new Map(mealRows.map((row) => [row.mealId, row]));

        const coursesForPrompt = courses.map((course) => ({
            title: course.title,
            mealOptions: course.mealIds.map((mealId) => {
                const meal = mealsById.get(mealId);
                return meal ? { title: meal.title, description: meal.description } : { title: mealId, description: '' };
            }),
        }));

        const trimmedTitle = currentTitle?.trim() ?? '';
        const trimmedDescription = currentDescription?.trim() ?? '';

        const system = `
Schreibe einen Namen und eine Beschreibung für ein Menü auf einer Privatkochvermittlungsplattform.
${trimmedTitle ? `Der aktuelle Name des Menüs lautet ${trimmedTitle}. Optimiere ihn gegebenenfalls.` : ''}
${trimmedDescription ? `Baue auch alle Aspekte der aktuellen Beschreibung des Menüs in die neue Beschreibung ein. Sie sieht wie folgt aus: ${trimmedDescription}. ` : ''}
Auf der Plattform können Kunden die Option haben aus verschiedenen Gerichten pro Gang zu wählen. Deswegen hast ein Gang einen title und eine Liste mealOptions.
Ist in dieser Liste nur ein Gericht, kann der Kunde nicht wählen.
Diese Liste für das gegebene Menü sieht als stringified JSON wie folgt aus: ${JSON.stringify(coursesForPrompt)}
Lasse auch die Gänge mit ihren Gerichtsoptionen in die Beschreibung und den Namen des Menüs einfließen.
Die Beschreibung sollte auf die frischen und gesunden verwendeten Zutaten hinweisen, sowie das Erlebnis der Kunden beschreiben.
Die Beschreibung wird auf einer Website veröffentlicht und ist somit auch SEO relevant.
Ziel ist es dass der Leser Lust bekommt dieses Menü zu buchen.
Es ist wichtig dass die Beschreibung aus der Ich Perspektive formuliert ist.
Gib als Ergebnis title und description zurück.
`.trim();

        const prompt = trimmedDescription
            ? `Baue auch alle Aspekte der aktuellen Beschreibung des Menüs ein, die wie folgt aussieht: ${trimmedDescription}`
            : 'Schlage einen passenden Menünamen und eine Beschreibung vor.';

        const result = await generateText({
            model: serverRuntime.ai.cookMenuTitleDescriptionModel(),
            system,
            prompt,
            output: Output.object({ schema: TITLE_DESCRIPTION_SCHEMA }),
            telemetry: aiTelemetry('COOK_MENU_TITLE_DESCRIPTION'),
        });

        serverRuntime.aiGenerations.record({
            kind: 'COOK_MENU_TITLE_DESCRIPTION',
            userId: cookId,
            sessionId: requestingSession.sessionId,
            system,
            prompt,
            output: aiGenerationOutputSerialize(result.output),
            ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
        });

        return {
            title: result.output.title.trim(),
            description: result.output.description.trim(),
            courses: [],
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
