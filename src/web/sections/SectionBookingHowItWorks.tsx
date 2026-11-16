import { Link } from '@tanstack/react-router';
import { PlayIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppImage } from '../components/AppImage';
import { AutoplayVideo } from '../components/AutoplayVideo';
import { Button } from '../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/base/dialog';
import { Reveal } from '../components/Reveal';
import { useIsMobile } from '../hooks/use-mobile';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';

const ASSET_BASE = '/home/booking-how-it-works';

type BookingStep = {
    id: 'a' | 'b' | 'c' | 'd';
    number: string;
    title: string;
    description: string;
    videoSrc: string;
    posterSrc: string;
    alternativeText: string;
};

export function SectionBookingHowItWorks() {
    const { t } = useT('public');
    const isMobile = useIsMobile();
    const [viewportReady, setViewportReady] = useState(false);
    const [filmOpen, setFilmOpen] = useState(false);
    const [filmPlaying, setFilmPlaying] = useState(false);
    const [filmEnded, setFilmEnded] = useState(false);
    const filmRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setViewportReady(true);
    }, []);

    const assetFolder = isMobile ? `${ASSET_BASE}/mobile` : ASSET_BASE;
    const filmSrc = `${assetFolder}/film-60s.mp4`;
    const filmPoster = `${assetFolder}/film-60s.webp`;
    const filmPosterWidth = isMobile ? 393 : 960;
    const filmPosterHeight = isMobile ? 852 : 540;

    useEffect(() => {
        if (filmOpen) return;
        const film = filmRef.current;
        if (film) {
            film.pause();
            film.currentTime = 0;
        }
        setFilmPlaying(false);
        setFilmEnded(false);
    }, [filmOpen]);

    useEffect(() => {
        const film = filmRef.current;
        if (film) {
            film.pause();
            film.currentTime = 0;
        }
        setFilmPlaying(false);
        setFilmEnded(false);
    }, [filmSrc]);

    function playFilm() {
        const film = filmRef.current;
        if (!film) return;
        if (filmEnded) {
            film.currentTime = 0;
            setFilmEnded(false);
        }
        setFilmPlaying(true);
        void film.play().catch(() => {
            setFilmPlaying(false);
        });
    }

    const steps: BookingStep[] = [
        {
            id: 'a',
            number: '01',
            title: t('home.booking.step1Title'),
            description: t('home.booking.step1Body'),
            videoSrc: `${assetFolder}/clip-a-anfrage.mp4`,
            posterSrc: `${assetFolder}/poster-a.webp`,
            alternativeText: t(isMobile ? 'home.booking.step1AltMobile' : 'home.booking.step1Alt'),
        },
        {
            id: 'b',
            number: '02',
            title: t('home.booking.step2Title'),
            description: t('home.booking.step2Body'),
            videoSrc: `${assetFolder}/clip-b-angebote.mp4`,
            posterSrc: `${assetFolder}/poster-b.webp`,
            alternativeText: t(isMobile ? 'home.booking.step2AltMobile' : 'home.booking.step2Alt'),
        },
        {
            id: 'c',
            number: '03',
            title: t('home.booking.step3Title'),
            description: t('home.booking.step3Body'),
            videoSrc: `${assetFolder}/clip-c-kennenlernen.mp4`,
            posterSrc: `${assetFolder}/poster-c.webp`,
            alternativeText: t(isMobile ? 'home.booking.step3AltMobile' : 'home.booking.step3Alt'),
        },
        {
            id: 'd',
            number: '04',
            title: t('home.booking.step4Title'),
            description: t('home.booking.step4Body'),
            videoSrc: `${assetFolder}/clip-d-bestaetigen.mp4`,
            posterSrc: `${assetFolder}/poster-d.webp`,
            alternativeText: t(isMobile ? 'home.booking.step4AltMobile' : 'home.booking.step4Alt'),
        },
    ];

    const headline = t('home.booking.headline');
    const subheadline = t('home.booking.subheadline');
    const filmButtonLabel = t('home.booking.watchFilm');
    const filmTitle = t('home.booking.filmTitle');
    const filmDescription = t('home.booking.filmDescription');
    const playFilmLabel = t('home.booking.playFilm');
    const replayFilmLabel = t('home.booking.replayFilm');
    const endedPrompt = t('home.booking.endedPrompt');
    const filmCtaLabel = t('home.comparison.cta');
    const ctaLabel = t('nav.sendRequest');
    const showFilmPreview = !filmPlaying || filmEnded;
    const loopFrameClassName = cn(
        'w-full shrink-0 overflow-hidden rounded-lg bg-muted',
        'aspect-1180/2556 max-h-[min(70vh,640px)] max-w-[280px] mx-auto',
        '@md:aspect-16/10 @md:max-h-none @md:max-w-none @md:mx-0',
    );

    return (
        <section className="px-4 py-16 @lg:px-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
                <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
                    <h2 className="font-serif text-3xl font-light @md:text-4xl">{headline}</h2>
                    <p className="text-muted-foreground @md:text-lg">{subheadline}</p>
                    <Button type="button" variant="outline" size="lg" onClick={() => setFilmOpen(true)}>
                        <PlayIcon className="size-4" aria-hidden />
                        {filmButtonLabel}
                    </Button>
                </Reveal>

                <div className="grid gap-10 @md:grid-cols-2 @md:items-stretch @md:gap-x-8 @md:gap-y-12">
                    {steps.map((step, index) => (
                        <Reveal className="flex h-full flex-col gap-4" index={index} key={step.id}>
                            <div className="flex flex-1 items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground text-sm text-background">
                                    {step.number}
                                </span>
                                <div className="min-w-0">
                                    <h3 className="font-serif text-xl font-normal text-pretty @md:text-2xl">{step.title}</h3>
                                    <p className="mt-1 text-pretty text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                            {viewportReady ? (
                                <AutoplayVideo
                                    src={step.videoSrc}
                                    poster={step.posterSrc}
                                    className={cn(loopFrameClassName, 'object-cover object-top')}
                                >
                                    {step.alternativeText}
                                </AutoplayVideo>
                            ) : (
                                <div className={loopFrameClassName} aria-hidden />
                            )}
                        </Reveal>
                    ))}
                </div>

                <Reveal className="flex justify-center">
                    <Button asChild size="lg">
                        <Link to="/{-$locale}/booking-request/form">{ctaLabel}</Link>
                    </Button>
                </Reveal>
            </div>

            <Dialog open={filmOpen} onOpenChange={setFilmOpen}>
                <DialogContent
                    className={cn(
                        'max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden p-0',
                        isMobile ? 'sm:max-w-sm' : 'sm:max-w-4xl lg:max-w-5xl',
                    )}
                >
                    <DialogHeader className="gap-1 px-6 pt-6 pb-4 pr-14 text-left">
                        <DialogTitle>{filmTitle}</DialogTitle>
                        <DialogDescription className="sr-only">{filmDescription}</DialogDescription>
                    </DialogHeader>

                    <div
                        className={cn(
                            'relative mx-auto w-full bg-foreground',
                            isMobile ? 'aspect-1180/2556 max-h-[min(75dvh,720px)] max-w-[320px]' : 'aspect-video max-w-none',
                        )}
                    >
                        {viewportReady ? (
                            <video
                                ref={filmRef}
                                className={cn('size-full object-cover', showFilmPreview ? 'invisible' : 'visible')}
                                controls={!showFilmPreview}
                                playsInline
                                preload="metadata"
                                poster={filmPoster}
                                src={filmSrc}
                                onPlay={() => {
                                    setFilmPlaying(true);
                                    setFilmEnded(false);
                                }}
                                onPause={(event) => {
                                    if (!event.currentTarget.ended) {
                                        setFilmPlaying(false);
                                    }
                                }}
                                onEnded={() => {
                                    setFilmPlaying(false);
                                    setFilmEnded(true);
                                }}
                            >
                                {filmDescription}
                            </video>
                        ) : null}

                        {viewportReady && showFilmPreview ? (
                            <button
                                type="button"
                                className="absolute inset-0 flex cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                onClick={playFilm}
                                aria-label={filmEnded ? replayFilmLabel : playFilmLabel}
                            >
                                <AppImage
                                    src={filmPoster}
                                    alt=""
                                    className="absolute inset-0 size-full object-cover"
                                    width={filmPosterWidth}
                                    height={filmPosterHeight}
                                />
                                <span className="relative z-10 flex size-14 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-sm active:bg-foreground/10">
                                    <PlayIcon className="size-6 translate-x-px" aria-hidden />
                                </span>
                            </button>
                        ) : null}
                    </div>

                    {filmEnded ? (
                        <div className="flex flex-col items-stretch gap-3 px-6 py-5">
                            <p className="text-center font-serif text-lg font-light">{endedPrompt}</p>
                            <Button asChild size="lg" className="w-full sm:mx-auto sm:max-w-sm">
                                <Link to="/{-$locale}/booking-request/form" onClick={() => setFilmOpen(false)}>
                                    {filmCtaLabel}
                                </Link>
                            </Button>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </section>
    );
}
