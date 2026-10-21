import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronDownIcon, PhoneIcon, RefreshCwIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useMutation } from 'urql';

import { formatDate, formatTime } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AudioWaveformPlayer } from '../../components/AudioWaveformPlayer';
import type { AudioWaveformPlayerHandle } from '../../components/AudioWaveformPlayer';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { AdminCallRecordingDeleteDocument, AdminCallRecordingSummaryGenerateDocument } from '../../graphql/generated';
import type { GqlCAdminCallPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { cn } from '../../utils/cn';

export const adminCallPageTitle = { de: 'Anruf', en: 'Call' } as const;
export const adminCallPageDescription = {
    de: 'Aufnahme, Zusammenfassung und Transkript eines Discovery-Anrufs.',
    en: 'Recording, summary, and transcript for a discovery call.',
} as const;

export function adminCallPageVariables(bookingRequestOfferCallRoomId: string) {
    return { bookingRequestOfferCallRoomId };
}

type AdminCallDetail = NonNullable<NonNullable<NonNullable<GqlCAdminCallPageQuery['currentSession']['user']>['admin']>['call']>;
type AdminCallRecording = NonNullable<AdminCallDetail['recording']>;
type TranscriptSegment = NonNullable<AdminCallRecording['transcriptSegments']>[number];

function recordingStatusLabel(status: AdminCallRecording['status'], locale: 'de' | 'en'): string {
    return {
        PENDING: { de: 'Aufnahme läuft', en: 'Recording in progress' },
        EGRESS_COMPLETE: { de: 'Audio gespeichert', en: 'Audio saved' },
        TRANSCRIBING: { de: 'Transkription…', en: 'Transcribing…' },
        COMPLETED: { de: 'Fertig', en: 'Completed' },
        FAILED: { de: 'Fehlgeschlagen', en: 'Failed' },
    }[status][locale];
}

function formatOffset(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function speakerDisplayName(
    speakerLabel: string | null | undefined,
    cookDisplayName: string,
    customerDisplayName: string,
    locale: 'de' | 'en',
): string {
    const key = speakerLabel?.toLowerCase();
    if (key === 'customer') return customerDisplayName;
    if (key === 'cook') return cookDisplayName;
    if (key === 'admin') return { de: 'Admin', en: 'Admin' }[locale];
    return { de: 'Unbekannt', en: 'Unknown' }[locale];
}

function speakerSide(speakerLabel: string | null | undefined): 'customer' | 'other' {
    return speakerLabel?.toLowerCase() === 'customer' ? 'customer' : 'other';
}

export function AdminCallPage({
    data,
    bookingRequestOfferCallRoomId,
}: {
    data: GqlCAdminCallPageQuery;
    bookingRequestOfferCallRoomId: string;
}) {
    const locale = useLocale();
    const call = data.currentSession.user?.admin?.call ?? null;
    const crumbLabel = call?.occasion.trim() || adminCallPageTitle[locale];

    return (
        <AdminPageChrome
            crumbs={[
                { label: { de: 'Anrufe', en: 'Calls' }[locale], to: '/{-$locale}/admin/calls' },
                { label: { de: 'Liste', en: 'List' }[locale], to: '/{-$locale}/admin/calls/list' },
                { label: crumbLabel },
            ]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminCallPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{adminCallPageDescription[locale]}</p>
                </div>

                {call ? (
                    <AdminCallDetailBody call={call} />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: `Anruf ${bookingRequestOfferCallRoomId} wurde nicht gefunden.`,
                                en: `Call ${bookingRequestOfferCallRoomId} was not found.`,
                            }[locale]
                        }
                    </p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminCallDetailBody({ call }: { call: AdminCallDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const when = `${formatDate(call.startedAt, { locale, timeZone, weekday: true })} · ${formatTime(call.startedAt, { locale, timeZone })}${
        locale === 'de' ? ' Uhr' : ''
    }`;

    return (
        <div className="grid gap-8">
            <section className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={call.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {
                            {
                                ACTIVE: { de: 'Live', en: 'Live' },
                                ENDED: { de: 'Beendet', en: 'Ended' },
                            }[call.status][locale]
                        }
                    </Badge>
                    <span className="text-sm text-muted-foreground tabular-nums">{when}</span>
                </div>
                <p className="text-lg font-medium text-foreground">{call.occasion || { de: 'Ohne Anlass', en: 'No occasion' }[locale]}</p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="grid gap-0.5">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Koch', en: 'Cook' }[locale]}
                        </dt>
                        <dd>
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: call.cookId }}
                                className="text-foreground hover:underline"
                            >
                                {call.cookDisplayName}
                            </Link>
                        </dd>
                    </div>
                    <div className="grid gap-0.5">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Kunde', en: 'Customer' }[locale]}
                        </dt>
                        <dd>
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: call.customerUserId }}
                                className="text-foreground hover:underline"
                            >
                                {call.customerDisplayName}
                            </Link>
                        </dd>
                    </div>
                </dl>
                <div>
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                            params={{
                                bookingRequestId: call.bookingRequestId,
                                bookingRequestOfferId: call.bookingRequestOfferId,
                            }}
                            search={{ tab: 'call' }}
                        >
                            {{ de: 'Zum Angebot', en: 'Open offer' }[locale]}
                        </Link>
                    </Button>
                </div>
            </section>

            <AdminCallRecordingReview call={call} />
        </div>
    );
}

function AdminCallRecordingReview({ call }: { call: AdminCallDetail }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const router = useRouter();
    const recording = call.recording;
    const playerRef = useRef<AudioWaveformPlayerHandle | null>(null);
    const [currentSec, setCurrentSec] = useState(0);
    const [transcriptOpen, setTranscriptOpen] = useState(false);
    const [summaryText, setSummaryText] = useState(recording?.summaryText ?? null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [, deleteRecording] = useMutation(AdminCallRecordingDeleteDocument);
    const [{ fetching: summarizing }, generateSummary] = useMutation(AdminCallRecordingSummaryGenerateDocument);

    if (!recording) {
        return (
            <section className="grid gap-2 rounded-lg border border-border p-4">
                <h2 className="text-sm font-medium text-foreground">{{ de: 'Aufnahme', en: 'Recording' }[locale]}</h2>
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Für diesen Anruf liegt keine Aufnahme vor.',
                            en: 'No recording exists for this call.',
                        }[locale]
                    }
                </p>
            </section>
        );
    }

    const segments = recording.transcriptSegments ?? [];
    const hasSegments = segments.length > 0;
    const currentMs = currentSec * 1000;
    const activeSegmentIndex = hasSegments
        ? segments.findIndex((segment) => currentMs >= segment.startedAtMs && currentMs < segment.endedAtMs)
        : -1;

    const onRegenerateSummary = async () => {
        setSummaryError(null);
        const result = await generateSummary({
            bookingRequestOfferCallRecordingId: recording.bookingRequestOfferCallRecordingId,
        });
        if (result.error || result.data?.admin.bookingRequestOfferCallRecordingSummaryGenerate == null) {
            setSummaryError({ de: 'Zusammenfassung konnte nicht erstellt werden.', en: 'Could not generate the summary.' }[locale]);
            return;
        }
        setSummaryText(result.data.admin.bookingRequestOfferCallRecordingSummaryGenerate);
        void router.invalidate();
    };

    const onConfirmDelete = async () => {
        setDeleteError(null);
        const result = await deleteRecording({
            bookingRequestOfferCallRecordingId: recording.bookingRequestOfferCallRecordingId,
        });
        if (result.error || !result.data?.admin.bookingRequestOfferCallRecordingDelete.success) {
            setDeleteError({ de: 'Löschen ist fehlgeschlagen.', en: 'Delete failed.' }[locale]);
            return;
        }
        setDeleteOpen(false);
        await navigate({ to: '/{-$locale}/admin/calls/list' });
    };

    return (
        <section className="grid gap-4">
            <div className="sticky top-0 z-10 grid gap-3 border-b border-border bg-background/95 py-3 backdrop-blur-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-sm font-medium text-foreground">{{ de: 'Aufnahme', en: 'Recording' }[locale]}</h2>
                    <Badge variant={recording.status === 'FAILED' ? 'destructive' : 'outline'}>
                        {recordingStatusLabel(recording.status, locale)}
                    </Badge>
                </div>

                {recording.audioUrl ? (
                    <AudioWaveformPlayer
                        src={recording.audioUrl}
                        waveformSeed={recording.bookingRequestOfferCallRecordingId}
                        tone="neutral"
                        barCount={64}
                        className="max-w-2xl"
                        ref={playerRef}
                        onCurrentTimeChange={setCurrentSec}
                        labels={{
                            group: { de: 'Anrufaufnahme', en: 'Call recording' }[locale],
                            play: { de: 'Anrufaufnahme abspielen', en: 'Play call recording' }[locale],
                            pause: { de: 'Anrufaufnahme pausieren', en: 'Pause call recording' }[locale],
                            position: { de: 'Wiedergabeposition', en: 'Playback position' }[locale],
                        }}
                        leading={
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <PhoneIcon className="size-5" aria-hidden />
                            </div>
                        }
                    />
                ) : null}
            </div>

            {recording.status === 'FAILED' ? (
                <div className="grid gap-3">
                    <StatusAlert tone="error" title={{ de: 'Fehler', en: 'Error' }[locale]}>
                        {recording.errorMessage ?? { de: 'Die Aufnahme ist fehlgeschlagen.', en: 'The recording failed.' }[locale]}
                    </StatusAlert>
                    {deleteError ? (
                        <StatusAlert tone="error" title={{ de: 'Fehler', en: 'Error' }[locale]}>
                            {deleteError}
                        </StatusAlert>
                    ) : null}
                    <div>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                            {{ de: 'Fehlgeschlagene Aufnahme löschen', en: 'Delete failed recording' }[locale]}
                        </Button>
                    </div>
                    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{{ de: 'Aufnahme löschen?', en: 'Delete recording?' }[locale]}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Die fehlgeschlagene Aufnahme wird aus dem Speicher und der Datenbank entfernt. Der Anruf selbst bleibt erhalten.',
                                            en: 'The failed recording will be removed from storage and the database. The call itself remains.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(event) => {
                                        event.preventDefault();
                                        void onConfirmDelete();
                                    }}
                                >
                                    {{ de: 'Löschen', en: 'Delete' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            ) : null}

            {recording.status === 'PENDING' || recording.status === 'EGRESS_COMPLETE' || recording.status === 'TRANSCRIBING' ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Zusammenfassung und Transkript erscheinen, sobald die Aufnahme fertig verarbeitet ist.',
                            en: 'Summary and transcript appear once processing finishes.',
                        }[locale]
                    }
                </p>
            ) : null}

            {recording.status === 'COMPLETED' ? (
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-medium text-foreground">{{ de: 'Zusammenfassung', en: 'Summary' }[locale]}</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={summarizing || !recording.transcriptText}
                                onClick={() => {
                                    void onRegenerateSummary();
                                }}
                            >
                                <RefreshCwIcon className={cn('size-3.5', summarizing && 'animate-spin')} aria-hidden />
                                {
                                    {
                                        de: summarizing ? 'Wird erstellt…' : summaryText ? 'Neu erzeugen' : 'Zusammenfassen',
                                        en: summarizing ? 'Generating…' : summaryText ? 'Regenerate' : 'Summarize',
                                    }[locale]
                                }
                            </Button>
                        </div>
                        {summaryError ? (
                            <StatusAlert tone="error" title={{ de: 'Fehler', en: 'Error' }[locale]}>
                                {summaryError}
                            </StatusAlert>
                        ) : null}
                        {summaryText ? (
                            <p className="whitespace-pre-wrap text-sm/relaxed text-foreground">{summaryText}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Noch keine Zusammenfassung. Mit „Zusammenfassen“ erzeugen.',
                                        en: 'No summary yet. Use Summarize to generate one.',
                                    }[locale]
                                }
                            </p>
                        )}
                    </div>

                    {hasSegments || recording.transcriptText ? (
                        <div className="grid gap-2">
                            <button
                                type="button"
                                onClick={() => setTranscriptOpen((open) => !open)}
                                className="flex items-center gap-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                aria-expanded={transcriptOpen}
                            >
                                <ChevronDownIcon
                                    className={cn('size-4 transition-transform', transcriptOpen && 'rotate-180')}
                                    aria-hidden
                                />
                                {
                                    {
                                        de: transcriptOpen ? 'Transkript ausblenden' : 'Transkript anzeigen',
                                        en: transcriptOpen ? 'Hide transcript' : 'Show transcript',
                                    }[locale]
                                }
                            </button>

                            {transcriptOpen ? (
                                hasSegments ? (
                                    <CallTranscriptChat
                                        segments={segments}
                                        activeSegmentIndex={activeSegmentIndex}
                                        cookDisplayName={call.cookDisplayName}
                                        customerDisplayName={call.customerDisplayName}
                                        canSeek={recording.audioUrl != null}
                                        onSeek={(startedAtMs) => {
                                            const player = playerRef.current;
                                            if (!player) return;
                                            player.seekTo(startedAtMs / 1000);
                                            void player.play();
                                        }}
                                    />
                                ) : (
                                    <p className="whitespace-pre-wrap text-sm text-foreground">{recording.transcriptText}</p>
                                )
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}

function CallTranscriptChat({
    segments,
    activeSegmentIndex,
    cookDisplayName,
    customerDisplayName,
    canSeek,
    onSeek,
}: {
    segments: readonly TranscriptSegment[];
    activeSegmentIndex: number;
    cookDisplayName: string;
    customerDisplayName: string;
    canSeek: boolean;
    onSeek: (startedAtMs: number) => void;
}) {
    const locale = useLocale();

    return (
        <ol className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3">
            {segments.map((segment, index) => {
                const side = speakerSide(segment.speakerLabel);
                const active = index === activeSegmentIndex;
                const name = speakerDisplayName(segment.speakerLabel, cookDisplayName, customerDisplayName, locale);
                const metaClass = side === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground';
                const nameClass = side === 'customer' ? 'text-primary-foreground/85' : 'text-foreground/80';
                const textClass = side === 'customer' ? 'text-primary-foreground' : 'text-foreground';
                const body = (
                    <>
                        <div className="flex items-baseline justify-between gap-2">
                            <span className={cn('text-xs font-medium', nameClass)}>{name}</span>
                            <span className={cn('text-[10px] tabular-nums', metaClass)}>{formatOffset(segment.startedAtMs)}</span>
                        </div>
                        <p className={cn('text-sm/relaxed', textClass)}>{segment.text}</p>
                    </>
                );

                return (
                    <li
                        key={`${segment.startedAtMs}-${index}`}
                        className={cn('flex w-full', side === 'customer' ? 'justify-end' : 'justify-start')}
                    >
                        {canSeek ? (
                            <button
                                type="button"
                                onClick={() => onSeek(segment.startedAtMs)}
                                className={cn(
                                    'grid max-w-[min(100%,28rem)] gap-1 rounded-2xl px-3 py-2 text-left transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                    side === 'customer'
                                        ? 'rounded-br-md bg-primary text-primary-foreground'
                                        : 'rounded-bl-md bg-background text-foreground shadow-sm ring-1 ring-border',
                                    active && (side === 'customer' ? 'ring-2 ring-sky-300' : 'ring-2 ring-sky-500'),
                                )}
                            >
                                {body}
                            </button>
                        ) : (
                            <div
                                className={cn(
                                    'grid max-w-[min(100%,28rem)] gap-1 rounded-2xl px-3 py-2',
                                    side === 'customer'
                                        ? 'rounded-br-md bg-primary text-primary-foreground'
                                        : 'rounded-bl-md bg-background text-foreground shadow-sm ring-1 ring-border',
                                )}
                            >
                                {body}
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
