import { generateText, Output } from 'ai';
import { eq } from 'drizzle-orm';
import { EgressStatus } from 'livekit-server-sdk';
import { z } from 'zod';

import { bookingRequestOfferCallRecordings } from '../../db/schema';
import type { BookingRequestOfferCallTranscriptSegment } from '../../domain/bookingRequest';
import { aiGenerationOutputSerialize } from '../../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../../utils/aiGenerationUsage';
import type { QueuedJobDefinition } from '../types';

export type BookingRequestOfferCallRecordingFinalizeData = {
    bookingRequestOfferCallRoomId: string;
};

const TRANSCRIPT_SCHEMA = z.object({
    segments: z.array(
        z.object({
            startedAtMs: z.number().int().nonnegative(),
            endedAtMs: z.number().int().nonnegative(),
            text: z.string().min(1),
            speakerLabel: z.string().nullable(),
        }),
    ),
});

const EGRESS_POLL_ATTEMPTS = 20;
const EGRESS_POLL_DELAY_MS = 5_000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * After a call room ends: wait for LiveKit egress to finish uploading audio to
 * Garage, then run Gemini STT and persist transcript segments.
 */
export const bookingRequestOfferCallRecordingFinalize: QueuedJobDefinition<BookingRequestOfferCallRecordingFinalizeData> = {
    kind: 'queued',
    name: 'booking-request-offer-call-recording-finalize',
    handler: async ({ data, serverRuntime }) => {
        const [recording] = await serverRuntime.db
            .select()
            .from(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRoomId, data.bookingRequestOfferCallRoomId))
            .limit(1);

        if (!recording) {
            return;
        }
        if (recording.status === 'COMPLETED' || recording.status === 'FAILED') {
            return;
        }
        if (!serverRuntime.objectStorage.isConfigured()) {
            return;
        }

        try {
            if (recording.status === 'PENDING' || recording.status === 'EGRESS_COMPLETE') {
                if (recording.status === 'PENDING') {
                    if (!recording.livekitEgressId) {
                        throw new Error('recording has no livekitEgressId');
                    }

                    let egressComplete = false;
                    let byteSize: number | undefined;
                    for (let attempt = 0; attempt < EGRESS_POLL_ATTEMPTS; attempt++) {
                        const infos = await serverRuntime.livekit.egress().listEgress({ egressId: recording.livekitEgressId });
                        const info = infos[0];
                        if (!info) {
                            await sleep(EGRESS_POLL_DELAY_MS);
                            continue;
                        }
                        if (info.status === EgressStatus.EGRESS_FAILED) {
                            throw new Error(info.error || 'LiveKit egress failed');
                        }
                        if (info.status === EgressStatus.EGRESS_COMPLETE) {
                            egressComplete = true;
                            const fileResult = info.fileResults[0];
                            byteSize = fileResult?.size ? Number(fileResult.size) : undefined;
                            break;
                        }
                        await sleep(EGRESS_POLL_DELAY_MS);
                    }

                    if (!egressComplete) {
                        throw new Error('LiveKit egress did not complete in time');
                    }

                    await serverRuntime.db
                        .update(bookingRequestOfferCallRecordings)
                        .set({
                            status: 'EGRESS_COMPLETE',
                            byteSize: byteSize ?? recording.byteSize,
                        })
                        .where(
                            eq(
                                bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId,
                                recording.bookingRequestOfferCallRecordingId,
                            ),
                        );
                }

                await serverRuntime.db
                    .update(bookingRequestOfferCallRecordings)
                    .set({ status: 'TRANSCRIBING' })
                    .where(
                        eq(
                            bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId,
                            recording.bookingRequestOfferCallRecordingId,
                        ),
                    );

                const object = await serverRuntime.objectStorage.getObject(recording.objectKey);
                const mediaType = object.contentType ?? recording.mediaType ?? 'audio/ogg';
                const system = [
                    'You transcribe discovery-call audio between a private chef, a customer, and optionally an admin.',
                    'Return only speech segments with approximate millisecond offsets from the start of the recording.',
                    'speakerLabel may be "customer", "cook", "admin", or null when unclear.',
                    'Prefer the language spoken (German or English). Do not invent content.',
                ].join(' ');
                const promptText = 'Transcribe this call recording into timed segments.';
                const byteLength = object.contentLength ?? object.body.byteLength;
                // Binary audio is not persisted — placeholder keeps the prompt
                // auditable without dumping media into Postgres.
                const promptForLedger = [promptText, `[file mediaType=${mediaType} byteLength=${byteLength}]`].join('\n');

                const result = await generateText({
                    model: serverRuntime.ai.bookingRequestOfferCallRecordingTranscriptModel(),
                    system,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: promptText },
                                { type: 'file', data: object.body, mediaType },
                            ],
                        },
                    ],
                    output: Output.object({ schema: TRANSCRIPT_SCHEMA }),
                });

                serverRuntime.aiGenerations.record({
                    kind: 'BOOKING_REQUEST_OFFER_CALL_RECORDING_TRANSCRIPT',
                    system,
                    prompt: promptForLedger,
                    output: aiGenerationOutputSerialize(result.output),
                    ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
                });

                const segments: BookingRequestOfferCallTranscriptSegment[] = result.output.segments.map((segment) => ({
                    startedAtMs: segment.startedAtMs,
                    endedAtMs: segment.endedAtMs,
                    text: segment.text.trim(),
                    ...(segment.speakerLabel ? { speakerLabel: segment.speakerLabel } : {}),
                }));
                const transcriptText = segments.map((segment) => segment.text).join('\n');

                await serverRuntime.db
                    .update(bookingRequestOfferCallRecordings)
                    .set({
                        status: 'COMPLETED',
                        transcriptJson: segments,
                        transcriptText,
                        mediaType,
                        byteSize: object.contentLength ?? object.body.byteLength,
                        completedAt: new Date(),
                        errorMessage: null,
                    })
                    .where(
                        eq(
                            bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId,
                            recording.bookingRequestOfferCallRecordingId,
                        ),
                    );

                await serverRuntime.publish.adminUpdates();
                return;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'finalize failed';
            serverRuntime.log.error(
                new Error(`bookingRequestOfferCallRecordingFinalize: ${message} (room=${data.bookingRequestOfferCallRoomId})`, {
                    cause: error,
                }),
                null,
            );
            await serverRuntime.db
                .update(bookingRequestOfferCallRecordings)
                .set({
                    status: 'FAILED',
                    errorMessage: message,
                    completedAt: new Date(),
                })
                .where(
                    eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, recording.bookingRequestOfferCallRecordingId),
                );
            await serverRuntime.publish.adminUpdates();
            throw error;
        }
    },
    options: {
        retryLimit: 3,
        retryDelay: 120,
        expireInSeconds: 1800,
    },
};
