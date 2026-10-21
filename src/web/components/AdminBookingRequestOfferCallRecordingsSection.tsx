import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';
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

function statusLabel(status: AdminBookingRequestOfferCallRecording['status'], locale: 'de' | 'en'): string {
    return {
        PENDING: { de: 'Aufnahme läuft', en: 'Recording in progress' },
        EGRESS_COMPLETE: { de: 'Audio gespeichert', en: 'Audio saved' },
        TRANSCRIBING: { de: 'Transkription…', en: 'Transcribing…' },
        COMPLETED: { de: 'Fertig', en: 'Completed' },
        FAILED: { de: 'Fehlgeschlagen', en: 'Failed' },
    }[status][locale];
}

function cardSnippet(recording: AdminBookingRequestOfferCallRecording, locale: 'de' | 'en'): string {
    if (recording.status === 'FAILED') {
        return recording.errorMessage?.trim() || { de: 'Aufnahme fehlgeschlagen.', en: 'Recording failed.' }[locale];
    }
    if (recording.summaryText?.trim()) {
        return recording.summaryText.trim();
    }
    if (recording.status === 'PENDING' || recording.status === 'EGRESS_COMPLETE' || recording.status === 'TRANSCRIBING') {
        return {
            de: 'Verarbeitung läuft. Zusammenfassung folgt nach dem Anruf.',
            en: 'Processing. Summary appears after the call.',
        }[locale];
    }
    return {
        de: 'Aufnahme bereit. Öffnen für Zusammenfassung und Transkript.',
        en: 'Recording ready. Open for summary and transcript.',
    }[locale];
}

export function AdminBookingRequestOfferCallRecordingsSection({
    recordings,
}: {
    readonly recordings: readonly AdminBookingRequestOfferCallRecording[];
}) {
    const locale = useLocale();

    if (recordings.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {
                    {
                        de: 'Noch keine Anrufaufnahmen für dieses Angebot.',
                        en: 'No call recordings for this offer yet.',
                    }[locale]
                }
            </p>
        );
    }

    return (
        <div className="grid gap-3">
            <h2 className="text-sm font-medium text-foreground">{{ de: 'Aufnahmen', en: 'Recordings' }[locale]}</h2>
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
                                <span className="text-xs font-medium text-foreground">
                                    {{ de: 'Anruf öffnen', en: 'Open call' }[locale]}
                                </span>
                            </div>
                            <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
