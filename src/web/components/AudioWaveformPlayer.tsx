import { PauseIcon, PlayIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { audioWaveformBars, formatAudioDuration } from '../utils/audioWaveform';
import { cn } from '../utils/cn';

type AudioWaveformPlayerTone = 'user' | 'assistant' | 'neutral';

export type AudioWaveformPlayerHandle = {
    seekTo: (seconds: number) => void;
    play: () => Promise<void>;
};

type AudioWaveformPlayerLabels = {
    group: string;
    play: string;
    pause: string;
    position: string;
};

type AudioWaveformPlayerProps = {
    src: string;
    /** Stable id used to seed the decorative waveform. */
    waveformSeed: string;
    tone?: AudioWaveformPlayerTone;
    barCount?: number;
    /** Optional left chrome (avatar, phone icon, …). Spans both rows. */
    leading?: ReactNode;
    /** Trailing content on the duration row (chat ticks, …). */
    meta?: ReactNode;
    labels: AudioWaveformPlayerLabels;
    className?: string;
    onCurrentTimeChange?: (seconds: number) => void;
};

export const AudioWaveformPlayer = forwardRef<AudioWaveformPlayerHandle, AudioWaveformPlayerProps>(function AudioWaveformPlayerInner(
    { src, waveformSeed, tone = 'neutral', barCount = 40, leading, meta, labels, className, onCurrentTimeChange },
    ref,
) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const draggingRef = useRef(false);
    const onCurrentTimeChangeRef = useRef(onCurrentTimeChange);
    const [playing, setPlaying] = useState(false);
    const [durationSec, setDurationSec] = useState(0);
    const [currentSec, setCurrentSec] = useState(0);
    const [dragging, setDragging] = useState(false);
    const labelId = useId();
    const bars = audioWaveformBars(waveformSeed, barCount);
    const progress = durationSec > 0 ? Math.min(1, Math.max(0, currentSec / durationSec)) : 0;
    const displaySec = playing || currentSec > 0 ? currentSec : durationSec;

    useEffect(() => {
        onCurrentTimeChangeRef.current = onCurrentTimeChange;
    }, [onCurrentTimeChange]);

    useEffect(() => {
        draggingRef.current = dragging;
    }, [dragging]);

    useEffect(() => {
        const audio = new Audio(src);
        audio.preload = 'metadata';
        audioRef.current = audio;

        const onLoaded = () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                setDurationSec(audio.duration);
            }
        };
        const onTimeUpdate = () => {
            if (!draggingRef.current) {
                setCurrentSec(audio.currentTime);
                onCurrentTimeChangeRef.current?.(audio.currentTime);
            }
        };
        const onEnded = () => {
            setPlaying(false);
            setCurrentSec(0);
            audio.currentTime = 0;
            onCurrentTimeChangeRef.current?.(0);
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
    }, [src]);

    useImperativeHandle(
        ref,
        () => ({
            seekTo(seconds: number) {
                const audio = audioRef.current;
                if (!audio || !Number.isFinite(seconds)) return;
                const next =
                    Number.isFinite(audio.duration) && audio.duration > 0
                        ? Math.min(audio.duration, Math.max(0, seconds))
                        : Math.max(0, seconds);
                audio.currentTime = next;
                setCurrentSec(next);
                onCurrentTimeChangeRef.current?.(next);
            },
            async play() {
                const audio = audioRef.current;
                if (!audio) return;
                try {
                    await audio.play();
                } catch {
                    setPlaying(false);
                }
            },
        }),
        [],
    );

    const seekFromClientX = (clientX: number) => {
        const audio = audioRef.current;
        const track = trackRef.current;
        if (!audio || !track || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const next = ratio * audio.duration;
        audio.currentTime = next;
        setCurrentSec(next);
        onCurrentTimeChangeRef.current?.(next);
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

    const playLabel = playing ? labels.pause : labels.play;
    const metaFg = tone === 'user' ? 'text-primary-foreground/65' : 'text-muted-foreground';
    const barPlayed = tone === 'user' ? 'bg-primary-foreground' : tone === 'assistant' ? 'bg-foreground/70' : 'bg-foreground/65';
    const barIdle = tone === 'user' ? 'bg-primary-foreground/35' : 'bg-foreground/25';
    const thumbClass =
        tone === 'user' ? 'bg-sky-300 ring-primary' : tone === 'assistant' ? 'bg-sky-500 ring-muted' : 'bg-sky-500 ring-background';
    const playIconClass = tone === 'user' ? 'text-primary-foreground' : 'text-foreground';

    return (
        <div
            className={cn(
                'grid w-full min-w-56 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1',
                leading == null && 'grid-cols-[auto_minmax(0,1fr)]',
                className,
            )}
            role="group"
            aria-labelledby={labelId}
        >
            <span id={labelId} className="sr-only">
                {labels.group}
            </span>
            {leading != null ? <div className="relative row-span-2 shrink-0">{leading}</div> : null}

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
                aria-valuetext={formatAudioDuration(displaySec)}
                aria-label={labels.position}
                className="relative flex h-4 min-w-0 cursor-pointer items-center touch-none"
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
                        onCurrentTimeChangeRef.current?.(next);
                    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        const next = Math.min(audio.duration, audio.currentTime + step);
                        audio.currentTime = next;
                        setCurrentSec(next);
                        onCurrentTimeChangeRef.current?.(next);
                    } else if (event.key === 'Home') {
                        event.preventDefault();
                        audio.currentTime = 0;
                        setCurrentSec(0);
                        onCurrentTimeChangeRef.current?.(0);
                    } else if (event.key === 'End') {
                        event.preventDefault();
                        audio.currentTime = audio.duration;
                        setCurrentSec(audio.duration);
                        onCurrentTimeChangeRef.current?.(audio.duration);
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

            <div className={cn('flex items-center justify-between gap-2', leading != null ? 'col-start-3' : 'col-start-2')}>
                <span className={cn('text-[10px]/none tabular-nums', metaFg)}>{formatAudioDuration(displaySec)}</span>
                {meta}
            </div>
        </div>
    );
});
