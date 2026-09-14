import { useLocale } from '../hooks/useLocale';
import { StatusAlert } from './base/status-alert';

type CallRecordingSegment = {
    startedAtMs: number;
    endedAtMs: number;
    text: string;
    speakerLabel: string | null;
};

export type AdminBookingRequestOfferCallRecording = {
    bookingRequestOfferCallRecordingId: string;
    bookingRequestOfferCallRoomId: string;
    status: 'PENDING' | 'EGRESS_COMPLETE' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';
    mediaType: string | null;
    byteSize: number | null;
    transcriptText: string | null;
    transcriptSegments: readonly CallRecordingSegment[] | null;
    audioUrl: string | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
};

function formatOffset(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function statusLabel(status: AdminBookingRequestOfferCallRecording['status'], locale: 'de' | 'en'): string {
    return {
        PENDING: { de: 'Aufnahme läuft', en: 'Recording in progress' },
        EGRESS_COMPLETE: { de: 'Audio gespeichert', en: 'Audio saved' },
        TRANSCRIBING: { de: 'Transkription…', en: 'Transcribing…' },
        COMPLETED: { de: 'Fertig', en: 'Completed' },
        FAILED: { de: 'Fehlgeschlagen', en: 'Failed' },
    }[status][locale];
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
        <div className="grid gap-4">
            <h2 className="text-sm font-medium text-foreground">
                {{ de: 'Aufnahmen & Transkripte', en: 'Recordings & transcripts' }[locale]}
            </h2>
            {recordings.map((recording) => (
                <div key={recording.bookingRequestOfferCallRecordingId} className="grid gap-3 rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{statusLabel(recording.status, locale)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(recording.createdAt).toLocaleString(locale)}</p>
                    </div>

                    {recording.status === 'FAILED' && recording.errorMessage ? (
                        <StatusAlert tone="error" title={{ de: 'Fehler', en: 'Error' }[locale]}>
                            {recording.errorMessage}
                        </StatusAlert>
                    ) : null}

                    {recording.audioUrl ? (
                        <audio controls preload="none" className="w-full" src={recording.audioUrl}>
                            <track kind="captions" />
                        </audio>
                    ) : null}

                    {recording.transcriptSegments && recording.transcriptSegments.length > 0 ? (
                        <ol className="grid gap-2 text-sm">
                            {recording.transcriptSegments.map((segment, index) => (
                                <li key={`${segment.startedAtMs}-${index}`} className="grid gap-0.5">
                                    <span className="text-xs text-muted-foreground">
                                        {formatOffset(segment.startedAtMs)}
                                        {segment.speakerLabel ? ` · ${segment.speakerLabel}` : ''}
                                    </span>
                                    <span className="text-foreground">{segment.text}</span>
                                </li>
                            ))}
                        </ol>
                    ) : recording.transcriptText ? (
                        <p className="whitespace-pre-wrap text-sm text-foreground">{recording.transcriptText}</p>
                    ) : recording.status === 'PENDING' || recording.status === 'EGRESS_COMPLETE' || recording.status === 'TRANSCRIBING' ? (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Transkript wird nach dem Anruf erstellt.',
                                    en: 'Transcript will appear after the call ends.',
                                }[locale]
                            }
                        </p>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
