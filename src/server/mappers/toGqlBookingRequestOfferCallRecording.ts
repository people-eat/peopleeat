import type { BookingRequestOfferCallRecording } from '../db/schema';
import type { GqlSBookingRequestOfferCallRecording } from '../graphql/generated';

export function toGqlBookingRequestOfferCallRecording(row: BookingRequestOfferCallRecording): GqlSBookingRequestOfferCallRecording {
    const segments = row.transcriptJson ?? null;
    return {
        bookingRequestOfferCallRecordingId: row.bookingRequestOfferCallRecordingId,
        bookingRequestOfferCallRoomId: row.bookingRequestOfferCallRoomId,
        status: row.status,
        mediaType: row.mediaType ?? null,
        byteSize: row.byteSize ?? null,
        transcriptText: row.transcriptText ?? null,
        transcriptSegments: segments
            ? segments.map((segment) => ({
                  startedAtMs: segment.startedAtMs,
                  endedAtMs: segment.endedAtMs,
                  text: segment.text,
                  speakerLabel: segment.speakerLabel ?? null,
              }))
            : null,
        audioUrl:
            row.status === 'COMPLETED' || row.status === 'EGRESS_COMPLETE' || row.status === 'TRANSCRIBING'
                ? `/api/admin/call-recordings/${row.bookingRequestOfferCallRecordingId}/audio`
                : null,
        errorMessage: row.errorMessage ?? null,
        createdAt: row.createdAt,
        completedAt: row.completedAt ?? null,
    };
}
