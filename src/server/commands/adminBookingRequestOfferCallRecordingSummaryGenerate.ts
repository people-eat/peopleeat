import { eq } from 'drizzle-orm';

import { bookingRequestOfferCallRecordings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferCallRecordingSummaryGenerateArgs,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferCallRecordingSummaryGenerate } from './bookingRequestOfferCallRecordingSummaryGenerate';

export async function adminBookingRequestOfferCallRecordingSummaryGenerate(
    { adminId }: GqlSAdminMutation,
    { bookingRequestOfferCallRecordingId }: GqlSAdminMutationBookingRequestOfferCallRecordingSummaryGenerateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<string> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [recording] = await serverRuntime.db
            .select({
                status: bookingRequestOfferCallRecordings.status,
                transcriptText: bookingRequestOfferCallRecordings.transcriptText,
            })
            .from(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId))
            .limit(1);

        if (!recording) {
            throw new Error('adminBookingRequestOfferCallRecordingSummaryGenerate: recording not found');
        }
        if (recording.status !== 'COMPLETED') {
            throw new Error('adminBookingRequestOfferCallRecordingSummaryGenerate: recording is not completed');
        }
        if (!recording.transcriptText?.trim()) {
            throw new Error('adminBookingRequestOfferCallRecordingSummaryGenerate: recording has no transcript');
        }

        const summary = await bookingRequestOfferCallRecordingSummaryGenerate({
            bookingRequestOfferCallRecordingId,
            requestingSession,
            serverRuntime,
        });
        if (!summary) {
            throw new Error('adminBookingRequestOfferCallRecordingSummaryGenerate: summary generation returned empty');
        }

        await serverRuntime.publish.adminUpdates();
        return summary;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
