import { generateText, Output } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { bookingRequestOfferCallRecordings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const SUMMARY_SCHEMA = z.object({
    summary: z.string().min(1),
});

const SUMMARY_SYSTEM = [
    'You write short admin summaries of private-chef discovery calls on peopleeat.',
    'Audience: internal ops / concierge who need the outcome at a glance.',
    'Write 2–4 short sentences or a few tight bullets (plain text, no markdown headings).',
    'Cover: who spoke, main topics (menu, date, guests, concerns), tone/outcome, and any clear next step.',
    'Use the same language as the transcript (German or English). Do not invent facts.',
    'Prefer concrete details over marketing language.',
].join(' ');

/**
 * Generate and persist an admin-facing AI summary for a completed call recording.
 * Returns the summary text, or null when there is no usable transcript.
 */
export async function bookingRequestOfferCallRecordingSummaryGenerate({
    bookingRequestOfferCallRecordingId,
    requestingSession,
    serverRuntime,
}: {
    bookingRequestOfferCallRecordingId: string;
    requestingSession: GqlSSession | null;
    serverRuntime: ServerRuntime;
}): Promise<string | null> {
    const [recording] = await serverRuntime.db
        .select()
        .from(bookingRequestOfferCallRecordings)
        .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId))
        .limit(1);

    if (!recording) {
        return null;
    }

    const transcript = recording.transcriptText?.trim() ?? '';
    if (!transcript) {
        return null;
    }

    const prompt = ['Summarize this discovery-call transcript for an admin:', '', transcript].join('\n');

    const result = await generateText({
        model: serverRuntime.ai.bookingRequestOfferCallRecordingSummaryModel(),
        instructions: SUMMARY_SYSTEM,
        prompt,
        output: Output.object({ schema: SUMMARY_SCHEMA }),
        telemetry: aiTelemetry('BOOKING_REQUEST_OFFER_CALL_RECORDING_SUMMARY'),
    });

    const summary = result.output.summary.trim();
    if (!summary) {
        return null;
    }

    serverRuntime.aiGenerations.record({
        kind: 'BOOKING_REQUEST_OFFER_CALL_RECORDING_SUMMARY',
        sessionId: requestingSession?.sessionId,
        system: SUMMARY_SYSTEM,
        prompt,
        output: aiGenerationOutputSerialize(result.output),
        ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
    });

    await serverRuntime.db
        .update(bookingRequestOfferCallRecordings)
        .set({ summaryText: summary })
        .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId));

    return summary;
}
