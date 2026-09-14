import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferCallRecordingFinalize } from '../jobs/handlers/bookingRequestOfferCallRecordingFinalize';

export async function bookingRequestOfferCallRecordingFinalizeEnqueue(
    serverRuntime: ServerRuntime,
    bookingRequestOfferCallRoomId: string,
): Promise<void> {
    if (!serverRuntime.objectStorage.isConfigured()) {
        return;
    }

    await serverRuntime.jobs.enqueue(
        bookingRequestOfferCallRecordingFinalize,
        { bookingRequestOfferCallRoomId },
        // Give LiveKit a moment to finish uploading after deleteRoom.
        { startAfter: 15 },
    );
}
