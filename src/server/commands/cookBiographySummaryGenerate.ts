import { generateText, Output } from 'ai';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { cooks, meals, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const BIOGRAPHY_SUMMARY_SCHEMA = z.object({
    biographySummary: z.string().min(1),
});

const BIOGRAPHY_SUMMARY_SYSTEM = `
Du schreibst kurze Koch-Porträts für die Premium-Plattform peopleeat.
Ziel: Der Kunde soll sich nach dem Lesen an den Koch erinnern können und verstehen, warum dieser Koch besonders ist.

Aufgabe:
- Beschreibe den Koch, nicht sein Essen.
- Verwende den Vornamen des Kochs immer im ersten Satz.
- Schreibe maximal 2 Sätze.
- Nutze konkrete Informationen aus der Biografie.
- Bevorzuge konkrete Orte, Hotels, Restaurants, Projekte, Auszeichnungen und besondere Stationen gegenüber allgemeinen Aussagen.
- Menüs und Gerichte dürfen nur genutzt werden, um den Kochstil besser zu verstehen. Beschreibe niemals konkrete Gerichte oder Menüs.
- Wenn konkrete Informationen vorhanden sind, verallgemeinere sie nicht.
- Schreibe in derselben Sprache wie die Biografie. Ist die Sprache unklar, schreibe auf Deutsch.

Beispiele:
Schlecht:
- internationale Erfahrung
- renommierte Restaurants
- verschiedene Stationen
- hochwertige Zutaten
- Leidenschaft fürs Kochen

Gut:
- Mallorca
- 4*-Hotels
- eigenes Restaurant in Frankfurt
- europäische Weingüter
- Reisen durch Asien

Nicht erwähnen:
- Hauptberufe außerhalb der Gastronomie
- Nebenberuflichkeit
- Hobbykoch
- "eigentlich"
- "ursprünglich"
- allgemeine Marketingfloskeln

Bevorzugte Themen:
- besondere Karrierewege
- bekannte Restaurants oder Hotels
- internationale Stationen
- eigene Restaurants
- Auszeichnungen
- TV-, Film- oder Eventprojekte
- Herkunft und persönliche Geschichte
- Gastgeberqualitäten

Schreibstil: natürlich, konkret, professionell, menschlich. Keine Werbesprache.

Beispiele für gute Porträts:
- "Roland betreut private Familien und Filmproduktionen in ganz Europa. Nach seiner Ausbildung in einem 4*-Hotel in Saalbach-Hinterglemm arbeitete er in mehreren Ländern und ist heute zwischen Mallorca und Hamburg unterwegs."
- "Salvatore sammelte Erfahrungen in Rom, Edinburgh, München und Köln. Stationen bei den Rocco Forte Hotels und dem Excelsior Hotel Ernst prägen seinen Anspruch an Gastfreundschaft."

Selbst wenn die Datenlage dünn ist, triff eine bestmögliche Schätzung auf Basis der vorhandenen Informationen.
Gib als Ergebnis biographySummary zurück.
`.trim();

export async function cookBiographySummaryGenerate({
    cookId,
    biography,
    cuisineStyle,
    cookingPhilosophy,
    requestingSession,
    serverRuntime,
}: {
    cookId: string;
    biography: string;
    cuisineStyle?: string | null;
    cookingPhilosophy?: string | null;
    requestingSession: GqlSSession | null;
    serverRuntime: ServerRuntime;
}): Promise<string | null> {
    const trimmedBiography = biography.trim();
    if (!trimmedBiography) {
        return null;
    }

    try {
        const [[user], [cook], mealRows] = await Promise.all([
            serverRuntime.db.select({ firstName: users.firstName }).from(users).where(eq(users.userId, cookId)),
            serverRuntime.db
                .select({ cuisineStyle: cooks.cuisineStyle, cookingPhilosophy: cooks.cookingPhilosophy })
                .from(cooks)
                .where(eq(cooks.cookId, cookId)),
            serverRuntime.db
                .select({ title: meals.title, description: meals.description })
                .from(meals)
                .where(and(eq(meals.cookId, cookId), isNull(meals.deletedAt))),
        ]);

        const resolvedCuisine = cuisineStyle !== undefined ? cuisineStyle : (cook?.cuisineStyle ?? null);
        const resolvedPhilosophy = cookingPhilosophy !== undefined ? cookingPhilosophy : (cook?.cookingPhilosophy ?? null);

        const mealsText = mealRows.length
            ? mealRows.map((meal) => `- Name: "${meal.title}", Beschreibung: "${meal.description || 'Keine'}"`).join('\n')
            : 'Keine Gerichte hinterlegt.';

        const prompt = [
            '## Vorname des Kochs',
            user?.firstName || 'Unbekannt',
            '',
            '## Biografie',
            trimmedBiography,
            '',
            '## Küchenstil',
            resolvedCuisine || 'Keiner',
            '',
            '## Kochphilosophie',
            resolvedPhilosophy || 'Keine',
            '',
            '## Menüs und Gerichte',
            mealsText,
        ].join('\n');

        const result = await generateText({
            model: serverRuntime.ai.cookBiographySummaryModel(),
            instructions: BIOGRAPHY_SUMMARY_SYSTEM,
            prompt,
            output: Output.object({ schema: BIOGRAPHY_SUMMARY_SCHEMA }),
            telemetry: aiTelemetry('COOK_BIOGRAPHY_SUMMARY'),
        });

        serverRuntime.aiGenerations.record({
            kind: 'COOK_BIOGRAPHY_SUMMARY',
            userId: cookId,
            sessionId: requestingSession?.sessionId,
            system: BIOGRAPHY_SUMMARY_SYSTEM,
            prompt,
            output: aiGenerationOutputSerialize(result.output),
            ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
        });

        return result.output.biographySummary.trim();
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
