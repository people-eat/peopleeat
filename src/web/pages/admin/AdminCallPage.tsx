import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronDownIcon, PhoneIcon, RefreshCwIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatDate, formatTime } from '../../../shared';
import { AdminOfferPartyCards } from '../../components/AdminOfferPartyCards';
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
import type { Locale } from '../../utils/locale';

export function adminCallPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.call.title');
}
export function adminCallPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.call.description');
}

export function adminCallPageVariables(bookingRequestOfferCallRoomId: string) {
    return { bookingRequestOfferCallRoomId };
}

type AdminCallDetail = NonNullable<NonNullable<NonNullable<GqlCAdminCallPageQuery['currentSession']['user']>['admin']>['call']>;
type AdminCallRecording = NonNullable<AdminCallDetail['recording']>;
type TranscriptSegment = NonNullable<AdminCallRecording['transcriptSegments']>[number];

function recordingStatusLabel(status: AdminCallRecording['status'], locale: Locale): string {
    const labels = {
        PENDING: t(locale, 'admin', 'copy.recordingInProgress'),
        EGRESS_COMPLETE: t(locale, 'admin', 'copy.audioSaved'),
        TRANSCRIBING: t(locale, 'admin', 'copy.transcribing'),
        COMPLETED: t(locale, 'admin', 'copy.completed3'),
        FAILED: t(locale, 'admin', 'copy.failed'),
    } satisfies Record<AdminCallRecording['status'], string>;
    return labels[status];
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
    locale: Locale,
): string {
    const key = speakerLabel?.toLowerCase();
    if (key === 'customer') return customerDisplayName;
    if (key === 'cook') return cookDisplayName;
    if (key === 'admin') return t(locale, 'admin', 'copy.admin');
    return t(locale, 'admin', 'copy.unknown');
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
    const crumbLabel = call?.occasion.trim() || adminCallPageTitle(locale);

    return (
        <AdminPageChrome
            crumbs={[
                { label: t(locale, 'admin', 'copy.calls2'), to: '/{-$locale}/admin/calls' },
                { label: t(locale, 'admin', 'copy.list'), to: '/{-$locale}/admin/calls/list' },
                { label: crumbLabel },
            ]}
        >
            <main id="main-content" className="grid w-full content-start gap-6">
                {call ? (
                    <AdminCallDetailBody call={call} />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.callNotFound', { id: bookingRequestOfferCallRoomId })}
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
        <div className="@container grid gap-6">
            <section className="grid gap-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Badge variant={call.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {call.status === 'ACTIVE' ? t(locale, 'admin', 'copy.live') : t(locale, 'admin', 'copy.ended')}
                    </Badge>
                    <p className="min-w-0 flex-1 text-base font-medium text-foreground">
                        {call.occasion || t(locale, 'admin', 'copy.noOccasion')}
                    </p>
                    <span className="text-sm text-muted-foreground tabular-nums">{when}</span>
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                            params={{
                                bookingRequestId: call.bookingRequestId,
                                bookingRequestOfferId: call.bookingRequestOfferId,
                            }}
                            search={{ tab: 'offer' }}
                        >
                            {t(locale, 'admin', 'copy.openOffer')}
                        </Link>
                    </Button>
                </div>
                <AdminOfferPartyCards
                    locale={locale}
                    cook={{
                        userId: call.cook.userId,
                        displayName: call.cook.displayName,
                        emailAddress: call.cook.emailAddress,
                        profilePictureUrl: call.cook.profilePicture?.url ?? null,
                    }}
                    customer={{
                        userId: call.customer.userId,
                        displayName: call.customer.displayName,
                        emailAddress: call.customer.emailAddress,
                        profilePictureUrl: call.customer.profilePicture?.url ?? null,
                    }}
                />
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
                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noRecordingExistsForThisCall')}</p>
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
            setSummaryError(t(locale, 'admin', 'copy.couldNotGenerateTheSummary'));
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
            setDeleteError(t(locale, 'admin', 'copy.deleteFailed'));
            return;
        }
        setDeleteOpen(false);
        await navigate({ to: '/{-$locale}/admin/calls/list' });
    };

    return (
        <section className="grid gap-4">
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 py-3 backdrop-blur-sm">
                {recording.audioUrl ? (
                    <AudioWaveformPlayer
                        src={recording.audioUrl}
                        waveformSeed={recording.bookingRequestOfferCallRecordingId}
                        tone="neutral"
                        barCount={64}
                        className="min-w-0 max-w-2xl flex-1"
                        ref={playerRef}
                        onCurrentTimeChange={setCurrentSec}
                        labels={{
                            group: t(locale, 'admin', 'copy.callRecording'),
                            play: t(locale, 'admin', 'copy.playCallRecording'),
                            pause: t(locale, 'admin', 'copy.pauseCallRecording'),
                            position: t(locale, 'admin', 'copy.playbackPosition'),
                        }}
                        leading={
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <PhoneIcon className="size-5" aria-hidden />
                            </div>
                        }
                    />
                ) : (
                    <div className="min-w-0 flex-1" />
                )}
                <Badge variant={recording.status === 'FAILED' ? 'destructive' : 'outline'} className="shrink-0">
                    {recordingStatusLabel(recording.status, locale)}
                </Badge>
            </div>

            {recording.status === 'FAILED' ? (
                <div className="grid gap-3">
                    <StatusAlert tone="error" title={t(locale, 'admin', 'copy.error')}>
                        {recording.errorMessage ?? t(locale, 'admin', 'copy.theRecordingFailed')}
                    </StatusAlert>
                    {deleteError ? (
                        <StatusAlert tone="error" title={t(locale, 'admin', 'copy.error')}>
                            {deleteError}
                        </StatusAlert>
                    ) : null}
                    <div>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                            {t(locale, 'admin', 'copy.deleteFailedRecording')}
                        </Button>
                    </div>
                    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t(locale, 'admin', 'copy.deleteRecording')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t(locale, 'admin', 'copy.theFailedRecordingWillBeRemovedFromStorageAndTheDatabaseTheC')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(event) => {
                                        event.preventDefault();
                                        void onConfirmDelete();
                                    }}
                                >
                                    {t(locale, 'admin', 'copy.delete')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            ) : null}

            {recording.status === 'PENDING' || recording.status === 'EGRESS_COMPLETE' || recording.status === 'TRANSCRIBING' ? (
                <p className="text-sm text-muted-foreground">
                    {t(locale, 'admin', 'copy.summaryAndTranscriptAppearOnceProcessingFinishes')}
                </p>
            ) : null}

            {recording.status === 'COMPLETED' ? (
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.summary')}</h3>
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
                                {summarizing
                                    ? t(locale, 'admin', 'copy.generating')
                                    : summaryText
                                      ? t(locale, 'admin', 'copy.regenerate')
                                      : t(locale, 'admin', 'copy.summarize')}
                            </Button>
                        </div>
                        {summaryError ? (
                            <StatusAlert tone="error" title={t(locale, 'admin', 'copy.error')}>
                                {summaryError}
                            </StatusAlert>
                        ) : null}
                        {summaryText ? (
                            <p className="whitespace-pre-wrap text-sm/relaxed text-foreground">{summaryText}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t(locale, 'admin', 'copy.noSummaryYetUseSummarizeToGenerateOne')}
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
                                {t(locale, 'admin', transcriptOpen ? 'copy.hideTranscript' : 'copy.showTranscript')}
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
