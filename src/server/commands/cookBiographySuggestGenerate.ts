import { generateText, Output } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const BIOGRAPHY_SUGGEST_SCHEMA = z.object({
    biography: z.string().min(1),
});

export async function cookBiographySuggestGenerate({
    cookId,
    currentBiography,
    requestingSession,
    serverRuntime,
}: {
    cookId: string;
    currentBiography: string;
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}): Promise<string> {
    const [user] = await serverRuntime.db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.userId, cookId));
    if (!user) {
        throw new Error('cookBiographySuggestGenerate: cook user not found');
    }

    const trimmed = currentBiography.trim();
    const system = `
Du bist ein professioneller Texter für Profilbeschreibungen auf Vermittlungsplattformen.
Schreibe stets in der Ich-Perspektive.
Schreibe in derselben Sprache wie die aktuelle Biografie. Ist die Biografie leer oder die Sprache unklar, schreibe auf Deutsch.
Ton: einladend, vertrauenswürdig und professionell. Ziel ist, Vertrauen zu erzeugen und Lust zu wecken, den Koch einzuladen.
Erwähne allgemein Gästezufriedenheit sowie Frische und Qualität der Lebensmittel und Zutaten.
Berücksichtige SEO: nutze natürliche, relevante Stichwörter für eine Privatkoch-/Private-Chef-Plattform, ohne Keyword-Stuffing.
Formale Einschränkungen: Schreibe keine Überschrift. Verwende keine Markdown-Formatierung. Nutze nur einfache Zeilenumbrüche (kein HTML, keine Listen).
Gib als Ergebnis biography zurück.
`.trim();

    const prompt = [
        'Schreibe eine Beschreibung für ein Kochprofil auf einer Privatkochvermittlungsplattform in der Ich-Perspektive.',
        `Der Name des Kochs lautet ${user.firstName} ${user.lastName}.`,
        'Die Beschreibung wird auf einer Website veröffentlicht und ist somit auch SEO relevant.',
        'Bei Kunden, die diese Beschreibung lesen, soll ein Gefühl von Vertrauenswürdigkeit und Professionalität aufkommen.',
        'Dass Wert auf die Zufriedenheit der Gäste sowie auf Frische und Qualität der Lebensmittel und Zutaten gelegt wird, trifft auf jeden Koch zu und soll dementsprechend mit eingebaut sein.',
        'Ziel ist, dass der Leser Lust bekommt, diesen Privatkoch zu sich nach Hause einzuladen und für sich kochen zu lassen.',
        'Schreibe keine Überschrift. Verwende keine Markdown-Formatierung und nur einfache Zeilenumbrüche.',
        trimmed
            ? `Baue auch alle Aspekte der aktuellen Beschreibung des Kochs ein, die wie folgt aussieht:\n${trimmed}`
            : 'Es gibt noch keine Biografie. Schreibe eine passende, einladende Erstfassung.',
    ].join('\n');

    const result = await generateText({
        model: serverRuntime.ai.cookBiographySuggestModel(),
        system,
        prompt,
        output: Output.object({ schema: BIOGRAPHY_SUGGEST_SCHEMA }),
    });

    serverRuntime.aiGenerations.record({
        kind: 'COOK_BIOGRAPHY_SUGGESTION',
        userId: cookId,
        sessionId: requestingSession.sessionId,
        system,
        prompt,
        output: aiGenerationOutputSerialize(result.output),
        ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
    });

    return result.output.biography.trim();
}
