import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

import { t } from '../../i18n/t';
import { useLocale } from '../hooks/useLocale';
import type { Locale } from '../utils/locale';
import { Badge } from './base/badge';

export type AdminBookingRequestOfferCallRecording = {
    bookingRequestOfferCallRecordingId: string;
    bookingRequestOfferCallRoomId: string;
    status: 'PENDING' | 'EGRESS_COMPLETE' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';
    mediaType: string | null;
    byteSize: number | null;
    transcriptText: string | null;
    summaryText?: string | null;
    transcriptSegments:
        | readonly {
              startedAtMs: number;
              endedAtMs: number;
              text: string;
              speakerLabel: string | null;
          }[]
        | null;
    audioUrl: string | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
};

function statusLabel(status: AdminBookingRequestOfferCallRecording['status'], locale: Locale): string {
    const labels = {
        PENDING: t(locale, 'admin', 'copy.recordingInProgress'),
        EGRESS_COMPLETE: t(locale, 'admin', 'copy.audioSaved'),
        TRANSCRIBING: t(locale, 'admin', 'copy.transcribing'),
        COMPLETED: t(locale, 'admin', 'copy.completed3'),
        FAILED: t(locale, 'admin', 'copy.failed'),
    } satisfies Record<AdminBookingRequestOfferCallRecording['status'], string>;
    return labels[status];
}

function cardSnippet(recording: AdminBookingRequestOfferCallRecording, locale: Locale): string {
    if (recording.status === 'FAILED') {
        return recording.errorMessage?.trim() || t(locale, 'admin', 'copy.recordingFailed');
    }
    if (recording.summaryText?.trim()) {
        return recording.summaryText.trim();
    }
    if (recording.status === 'PENDING' || recording.status === 'EGRESS_COMPLETE' || recording.status === 'TRANSCRIBING') {
        return t(locale, 'admin', 'copy.processingSummaryAppearsAfterTheCall');
    }
    return t(locale, 'admin', 'copy.recordingReadyOpenForSummaryAndTranscript');
}

export function AdminBookingRequestOfferCallRecordingsSection({
    recordings,
}: {
    readonly recordings: readonly AdminBookingRequestOfferCallRecording[];
}) {
    const locale = useLocale();

    if (recordings.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noCallRecordingsForThisOfferYet')}</p>;
    }

    return (
        <div className="grid gap-3">
            <h2 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.recordings')}</h2>
            <ul className="grid gap-2">
                {recordings.map((recording) => (
                    <li key={recording.bookingRequestOfferCallRecordingId}>
                        <Link
                            to="/{-$locale}/admin/calls/$bookingRequestOfferCallRoomId"
                            params={{ bookingRequestOfferCallRoomId: recording.bookingRequestOfferCallRoomId }}
                            className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            <div className="grid min-w-0 flex-1 gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={recording.status === 'FAILED' ? 'destructive' : 'outline'}>
                                        {statusLabel(recording.status, locale)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {new Date(recording.createdAt).toLocaleString(locale)}
                                    </span>
                                </div>
                                <p className="line-clamp-2 text-sm text-muted-foreground">{cardSnippet(recording, locale)}</p>
                                <span className="text-xs font-medium text-foreground">{t(locale, 'admin', 'copy.openCall')}</span>
                            </div>
                            <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
