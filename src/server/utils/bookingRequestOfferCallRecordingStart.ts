import { EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferCallRecordings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

const CALL_RECORDING_MEDIA_TYPE = 'audio/ogg';

/**
 * Best-effort audio-only room composite egress to Garage. Skips when call-
 * recording storage is not configured. Failures are logged; the live call
 * still proceeds.
 */
export async function bookingRequestOfferCallRecordingStart(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferCallRoomId: string;
        livekitRoomName: string;
    },
): Promise<void> {
    if (!serverRuntime.objectStorage.isConfigured()) {
        return;
    }

    const prefix = serverRuntime.livekit.roomPrefix();
    const objectKey = `${prefix}/call-rooms/${args.bookingRequestOfferCallRoomId}.ogg`;
    const bookingRequestOfferCallRecordingId = idCreate();

    try {
        const s3 = serverRuntime.objectStorage.s3Credentials();
        const egressInfo = await serverRuntime.livekit.egress().startRoomCompositeEgress(
            args.livekitRoomName,
            new EncodedFileOutput({
                fileType: EncodedFileType.OGG,
                filepath: objectKey,
                disableManifest: true,
                output: {
                    case: 's3',
                    value: new S3Upload({
                        accessKey: s3.accessKey,
                        secret: s3.secret,
                        region: s3.region,
                        endpoint: s3.endpoint,
                        bucket: s3.bucket,
                        forcePathStyle: s3.forcePathStyle,
                    }),
                },
            }),
            { audioOnly: true },
        );

        await serverRuntime.db.insert(bookingRequestOfferCallRecordings).values({
            bookingRequestOfferCallRecordingId,
            bookingRequestOfferCallRoomId: args.bookingRequestOfferCallRoomId,
            livekitEgressId: egressInfo.egressId,
            objectKey,
            mediaType: CALL_RECORDING_MEDIA_TYPE,
            status: 'PENDING',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'egress start failed';
        serverRuntime.log.error(
            new Error(`bookingRequestOfferCallRecordingStart: ${message} (room=${args.bookingRequestOfferCallRoomId})`, { cause: error }),
            null,
        );

        try {
            await serverRuntime.db.insert(bookingRequestOfferCallRecordings).values({
                bookingRequestOfferCallRecordingId,
                bookingRequestOfferCallRoomId: args.bookingRequestOfferCallRoomId,
                objectKey,
                mediaType: CALL_RECORDING_MEDIA_TYPE,
                status: 'FAILED',
                errorMessage: message,
                completedAt: new Date(),
            });
        } catch {
            // Insert of FAILED row is best-effort; original error already logged.
        }
    }
}
