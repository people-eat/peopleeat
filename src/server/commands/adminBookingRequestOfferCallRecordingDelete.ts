import { eq } from 'drizzle-orm';

import { bookingRequestOfferCallRecordings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferCallRecordingDeleteArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/**
 * Admin cleanup for FAILED call recordings: best-effort Garage delete + DB row.
 */
export async function adminBookingRequestOfferCallRecordingDelete(
    { adminId }: GqlSAdminMutation,
    { bookingRequestOfferCallRecordingId }: GqlSAdminMutationBookingRequestOfferCallRecordingDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [recording] = await serverRuntime.db
            .select()
            .from(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId))
            .limit(1);

        if (!recording) {
            throw new Error('adminBookingRequestOfferCallRecordingDelete: recording not found');
        }
        if (recording.status !== 'FAILED') {
            throw new Error('adminBookingRequestOfferCallRecordingDelete: only FAILED recordings can be deleted');
        }

        if (serverRuntime.objectStorage.isConfigured() && recording.objectKey) {
            try {
                await serverRuntime.objectStorage.deleteObject(recording.objectKey);
            } catch (error) {
                serverRuntime.log.warn(
                    `adminBookingRequestOfferCallRecordingDelete: Garage delete failed for ${recording.objectKey}: ${
                        error instanceof Error ? error.message : 'unknown'
                    }`,
                    requestingSession,
                );
            }
        }

        await serverRuntime.db
            .delete(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId));

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: bookingRequestOfferCallRecordingId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
