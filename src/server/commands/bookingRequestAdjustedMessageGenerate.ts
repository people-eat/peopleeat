import { generateText } from 'ai';
import { eq } from 'drizzle-orm';

import { textNormalizeProseTitled } from '../../shared/textNormalize';
import { bookingRequestCooks, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const ADJUSTED_MESSAGE_SYSTEM = `
Wir sind eine Plattform die Buchungsanfragen von Kunden an Privatköche vermittelt.
In unserem Buchungsprozess können die Kunden im letzten Schritt eine Freitextnachricht schreiben,
die unseren Köchen automatisiert angezeigt wird. Aus Datenschutz- und Geschäftsprozessgründen muss
sichergestellt sein, dass darin keine personenbezogenen Daten, wie Telefonnummer, E-Mail Adresse
oder geografische Adresse vorkommen. Es soll genügend Kontext für Köche bereitgestellt werden, dass
sie wissen, auf welche Art von Anlass sie sich bei diesen Event ein lassen.
Bitte passe die Nachricht mit möglichst wenigen Änderungen an, Formuliere sie gegenenfalls besser aus,
korrigiere Rechtschreib- und Grammatik Fehler. In der geänderten Nachricht sollte nicht explitzit betont
sein, dass Daten nicht mit angegeben wurden.
Versuche der Nachricht allerdings nicht ihre Persönlichkeit zu nehmen, das heißt Smileys etc. sollten erhalten bleiben.
Du erhältst den Anlass, sowie die aktuelle Nachricht. Bitte antworte mit der angepassten Nachricht.
`.trim();

/**
 * One-shot rewrite of a booking request's cook-facing message into
 * `adjustedMessage`. Short-circuits when the request is missing, the original
 * is empty, or an adjusted message is already set (admin override wins).
 * Returns the persisted text, or null when skipped / failed.
 */
export async function bookingRequestAdjustedMessageGenerate({
    bookingRequestId,
    requestingSession,
    serverRuntime,
}: {
    bookingRequestId: string;
    requestingSession: GqlSSession | null;
    serverRuntime: ServerRuntime;
}): Promise<string | null> {
    const [bookingRequest] = await serverRuntime.db
        .select({
            bookingRequestId: bookingRequests.bookingRequestId,
            userId: bookingRequests.userId,
            occasion: bookingRequests.occasion,
            originalMessage: bookingRequests.originalMessage,
            adjustedMessage: bookingRequests.adjustedMessage,
        })
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
        .limit(1);

    if (!bookingRequest) {
        serverRuntime.log.warn(`bookingRequestAdjustedMessageGenerate: booking request ${bookingRequestId} not found`);
        return null;
    }

    if (bookingRequest.adjustedMessage != null && bookingRequest.adjustedMessage.trim().length > 0) {
        return bookingRequest.adjustedMessage;
    }

    const originalMessage = bookingRequest.originalMessage.trim();
    if (originalMessage.length === 0) {
        return null;
    }

    const [customer] = await serverRuntime.db
        .select({ locale: users.locale })
        .from(users)
        .where(eq(users.userId, bookingRequest.userId))
        .limit(1);

    const occasionFallback = { de: 'Unbekannt', en: 'Unknown' }[customer?.locale === 'en' ? 'en' : 'de'];
    const occasion = bookingRequest.occasion.trim() || occasionFallback;
    const prompt = `Anlass: ${occasion}; Nachricht: ${originalMessage}`;

    try {
        const result = await generateText({
            model: serverRuntime.ai.bookingRequestAdjustedMessageModel(),
            instructions: ADJUSTED_MESSAGE_SYSTEM,
            prompt,
            telemetry: aiTelemetry('BOOKING_REQUEST_ADJUSTED_MESSAGE'),
        });

        const adjustedMessage = textNormalizeProseTitled(result.text);
        if (adjustedMessage.length === 0) {
            serverRuntime.log.warn(`bookingRequestAdjustedMessageGenerate: empty model output for ${bookingRequestId}`);
            return null;
        }

        serverRuntime.aiGenerations.record({
            kind: 'BOOKING_REQUEST_ADJUSTED_MESSAGE',
            userId: bookingRequest.userId,
            sessionId: requestingSession?.sessionId,
            system: ADJUSTED_MESSAGE_SYSTEM,
            prompt,
            output: aiGenerationOutputSerialize(result.text),
            ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
        });

        await serverRuntime.db
            .update(bookingRequests)
            .set({ adjustedMessage })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId));

        const cookRows = await serverRuntime.db
            .select({ cookId: bookingRequestCooks.cookId })
            .from(bookingRequestCooks)
            .where(eq(bookingRequestCooks.bookingRequestId, bookingRequestId));

        await Promise.all([
            serverRuntime.publish.adminUpdates(),
            ...cookRows.map((row) => serverRuntime.publish.userUpdates({ userId: row.cookId })),
        ]);

        return adjustedMessage;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
