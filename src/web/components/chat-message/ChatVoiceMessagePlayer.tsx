import { MicIcon, PauseIcon, PlayIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { formatVoiceDuration, voiceWaveformBars } from '../../chat/chatVoiceMessage';
import type { GqlCFileUpload, GqlCPublicUser } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '../base/avatar';

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export function ChatVoiceMessagePlayer({
    attachment,
    author,
    tone,
    meta,
}: {
    attachment: GqlCFileUpload;
    author: GqlCPublicUser;
    tone: 'user' | 'assistant';
    /** Timestamp / delivery ticks on the same row as the duration (WhatsApp layout). */
    meta?: ReactNode;
}) {
    const locale = useLocale();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const draggingRef = useRef(false);
    const [playing, setPlaying] = useState(false);
    const [durationSec, setDurationSec] = useState(0);
    const [currentSec, setCurrentSec] = useState(0);
    const [dragging, setDragging] = useState(false);
    const labelId = useId();
    const bars = voiceWaveformBars(attachment.fileUploadId, 40);
    const progress = durationSec > 0 ? Math.min(1, Math.max(0, currentSec / durationSec)) : 0;
    const displaySec = playing || currentSec > 0 ? currentSec : durationSec;

    useEffect(() => {
        draggingRef.current = dragging;
    }, [dragging]);

    useEffect(() => {
        const audio = new Audio(attachment.url);
        audio.preload = 'metadata';
        audioRef.current = audio;

        const onLoaded = () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                setDurationSec(audio.duration);
            }
        };
        const onTimeUpdate = () => {
            if (!draggingRef.current) setCurrentSec(audio.currentTime);
        };
        const onEnded = () => {
            setPlaying(false);
            setCurrentSec(0);
            audio.currentTime = 0;
        };
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);

        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('durationchange', onLoaded);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);

        return () => {
            audio.pause();
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('durationchange', onLoaded);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audioRef.current = null;
        };
    }, [attachment.url]);

    const seekFromClientX = (clientX: number) => {
        const audio = audioRef.current;
        const track = trackRef.current;
        if (!audio || !track || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const next = ratio * audio.duration;
        audio.currentTime = next;
        setCurrentSec(next);
    };

    const togglePlayback = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            try {
                await audio.play();
            } catch {
                setPlaying(false);
            }
            return;
        }
        audio.pause();
    };

    const playLabel = playing
        ? { de: 'Sprachnachricht pausieren', en: 'Pause voice message' }[locale]
        : { de: 'Sprachnachricht abspielen', en: 'Play voice message' }[locale];

    const metaFg = tone === 'user' ? 'text-primary-foreground/65' : 'text-muted-foreground';
    const barPlayed = tone === 'user' ? 'bg-primary-foreground' : 'bg-foreground/70';
    const barIdle = tone === 'user' ? 'bg-primary-foreground/35' : 'bg-foreground/25';
    const thumbClass = tone === 'user' ? 'bg-sky-300 ring-primary' : 'bg-sky-500 ring-muted';
    const playIconClass = tone === 'user' ? 'text-primary-foreground' : 'text-foreground';

    return (
        <div
            className="grid w-full min-w-56 max-w-xs grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1"
            role="group"
            aria-labelledby={labelId}
        >
            <span id={labelId} className="sr-only">
                {{ de: 'Sprachnachricht', en: 'Voice message' }[locale]}
            </span>
            <div className="relative size-10 shrink-0">
                <Avatar className="size-10">
                    {author.profilePicture != null ? <AvatarImage src={author.profilePicture.url} alt="" /> : null}
                    <AvatarFallback className="bg-foreground/10 text-xs font-semibold text-foreground/75">
                        {initialsFromName(author.display)}
                    </AvatarFallback>
                </Avatar>
                <span
                    aria-hidden
                    className={cn(
                        'absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full ring-2',
                        tone === 'user' ? 'bg-emerald-600 text-white ring-primary' : 'bg-emerald-600 text-white ring-muted',
                    )}
                >
                    <MicIcon className="size-2.5" strokeWidth={2.5} />
                </span>
            </div>

            <button
                type="button"
                onClick={() => {
                    void togglePlayback();
                }}
                aria-label={playLabel}
                className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    playIconClass,
                )}
            >
                {playing ? (
                    <PauseIcon className="size-5 fill-current" aria-hidden />
                ) : (
                    <PlayIcon className="size-5 fill-current" aria-hidden />
                )}
            </button>

            <div
                ref={trackRef}
                role="slider"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={Math.max(1, Math.floor(durationSec))}
                aria-valuenow={Math.floor(currentSec)}
                aria-valuetext={formatVoiceDuration(displaySec)}
                aria-label={{ de: 'Wiedergabeposition', en: 'Playback position' }[locale]}
                className="relative flex h-7 min-w-0 cursor-pointer items-center touch-none"
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging(true);
                    seekFromClientX(event.clientX);
                }}
                onPointerMove={(event) => {
                    if (!dragging) return;
                    seekFromClientX(event.clientX);
                }}
                onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    setDragging(false);
                }}
                onPointerCancel={() => setDragging(false)}
                onKeyDown={(event) => {
                    const audio = audioRef.current;
                    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
                    const step = event.shiftKey ? 5 : 1;
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        const next = Math.max(0, audio.currentTime - step);
                        audio.currentTime = next;
                        setCurrentSec(next);
                    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        const next = Math.min(audio.duration, audio.currentTime + step);
                        audio.currentTime = next;
                        setCurrentSec(next);
                    } else if (event.key === 'Home') {
                        event.preventDefault();
                        audio.currentTime = 0;
                        setCurrentSec(0);
                    } else if (event.key === 'End') {
                        event.preventDefault();
                        audio.currentTime = audio.duration;
                        setCurrentSec(audio.duration);
                    }
                }}
            >
                <div className="flex size-full items-center gap-px px-0.5" aria-hidden>
                    {bars.map((height, index) => {
                        const barProgress = (index + 0.5) / bars.length;
                        const played = barProgress <= progress;
                        return (
                            <span
                                key={index}
                                className={cn('w-full max-w-[3px] min-w-[2px] rounded-full', played ? barPlayed : barIdle)}
                                style={{ height: `${Math.round(height * 100)}%` }}
                            />
                        );
                    })}
                </div>
                <span
                    aria-hidden
                    className={cn('pointer-events-none absolute top-1/2 size-3 -translate-1/2 rounded-full shadow-sm', thumbClass)}
                    style={{ left: `${progress * 100}%` }}
                />
            </div>

            <div className="col-start-3 flex items-center justify-between gap-2">
                <span className={cn('text-[10px]/none tabular-nums', metaFg)}>{formatVoiceDuration(displaySec)}</span>
                {meta}
            </div>
        </div>
    );
}
