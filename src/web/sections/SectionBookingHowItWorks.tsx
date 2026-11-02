import { Link } from '@tanstack/react-router';
import { PlayIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppImage } from '../components/AppImage';
import { AutoplayVideo } from '../components/AutoplayVideo';
import { Button } from '../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/base/dialog';
import { Reveal } from '../components/Reveal';
import { useIsMobile } from '../hooks/use-mobile';
import { useLocale } from '../hooks/useLocale';
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
    const locale = useLocale();
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
            title: { de: 'Anfrage senden', en: 'Send a request' }[locale],
            description: {
                de: 'Beschreibe Anlass, Gäste, Ort und Wünsche. In wenigen Schritten sind die Köche informiert.',
                en: 'Describe the occasion, guests, place, and wishes. In a few steps, chefs nearby are notified.',
            }[locale],
            videoSrc: `${assetFolder}/clip-a-anfrage.mp4`,
            posterSrc: `${assetFolder}/poster-a.webp`,
            alternativeText: {
                de: isMobile
                    ? 'Mobile Bildschirmaufnahme: Buchungsanfrage für einen Geburtstag in München wird ausgefüllt.'
                    : 'Bildschirmaufnahme: Buchungsanfrage für einen Geburtstag in München wird ausgefüllt.',
                en: isMobile
                    ? 'Mobile screen recording: a booking request for a birthday in Munich is filled in.'
                    : 'Screen recording: a booking request for a birthday in Munich is filled in.',
            }[locale],
        },
        {
            id: 'b',
            number: '02',
            title: { de: 'Angebote vergleichen', en: 'Compare offers' }[locale],
            description: {
                de: 'Köche schicken individuelle Menüs mit einem klaren Gesamtpreis. Du vergleichst in Ruhe.',
                en: 'Chefs send individual menus with one clear total price. Compare them at your pace.',
            }[locale],
            videoSrc: `${assetFolder}/clip-b-angebote.mp4`,
            posterSrc: `${assetFolder}/poster-b.webp`,
            alternativeText: {
                de: isMobile
                    ? 'Mobile Bildschirmaufnahme: drei Koch-Angebote mit Menüs und Preisen werden verglichen.'
                    : 'Bildschirmaufnahme: drei Koch-Angebote mit Menüs und Preisen werden verglichen.',
                en: isMobile
                    ? 'Mobile screen recording: three chef offers with menus and prices are compared.'
                    : 'Screen recording: three chef offers with menus and prices are compared.',
            }[locale],
        },
        {
            id: 'c',
            number: '03',
            title: { de: 'Kennenlernen', en: 'Meet your chef' }[locale],
            description: {
                de: 'Schreib im Chat, ruf per Video an und kläre Details. Unsere Concierge ist mit dabei.',
                en: 'Chat, join a video call, and settle the details. Our concierge is there with you.',
            }[locale],
            videoSrc: `${assetFolder}/clip-c-kennenlernen.mp4`,
            posterSrc: `${assetFolder}/poster-c.webp`,
            alternativeText: {
                de: isMobile
                    ? 'Mobile Bildschirmaufnahme: Chat mit Koch und Concierge sowie bestätigter Videoanruf-Termin.'
                    : 'Bildschirmaufnahme: Chat mit Koch und Concierge sowie bestätigter Videoanruf-Termin.',
                en: isMobile
                    ? 'Mobile screen recording: chat with chef and concierge, plus a confirmed video-call slot.'
                    : 'Screen recording: chat with chef and concierge, plus a confirmed video-call slot.',
            }[locale],
        },
        {
            id: 'd',
            number: '04',
            title: { de: 'Bestätigen und bezahlen', en: 'Confirm and pay' }[locale],
            description: {
                de: 'Nimm dein Wunschmenü an und bezahle sicher. Danach hält der Koch den Termin für dich frei.',
                en: 'Accept your preferred menu and pay securely. The chef then holds the date for you.',
            }[locale],
            videoSrc: `${assetFolder}/clip-d-bestaetigen.mp4`,
            posterSrc: `${assetFolder}/poster-d.webp`,
            alternativeText: {
                de: isMobile
                    ? 'Mobile Bildschirmaufnahme: Angebot annehmen und zur sicheren Zahlung weiterleiten.'
                    : 'Bildschirmaufnahme: Angebot annehmen und zur sicheren Zahlung weiterleiten.',
                en: isMobile
                    ? 'Mobile screen recording: accepting an offer and continuing to secure checkout.'
                    : 'Screen recording: accepting an offer and continuing to secure checkout.',
            }[locale],
        },
    ];

    const headline = { de: 'So buchst du deinen Privatkoch', en: 'How you book your private chef' }[locale];
    const subheadline = {
        de: 'Von der Anfrage bis zur Zusage: klar, transparent und ohne Umwege.',
        en: 'From request to confirmation: clear, transparent, and without detours.',
    }[locale];
    const filmButtonLabel = { de: '60 Sekunden ansehen', en: 'Watch 60 seconds' }[locale];
    const filmTitle = { de: 'peopleeat in 60 Sekunden', en: 'peopleeat in 60 seconds' }[locale];
    const filmDescription = {
        de: 'Kurzer Überblick: Anfrage, Angebote, Kennenlernen und Buchung. Mit deutscher Erzählung und Untertiteln.',
        en: 'A short overview: request, offers, meeting your chef, and booking. German narration and captions.',
    }[locale];
    const playFilmLabel = { de: 'Film abspielen', en: 'Play film' }[locale];
    const replayFilmLabel = { de: 'Nochmal ansehen', en: 'Watch again' }[locale];
    const endedPrompt = {
        de: 'Bereit für deinen Abend?',
        en: 'Ready for your evening?',
    }[locale];
    const filmCtaLabel = { de: 'Unverbindlich anfragen', en: 'Request without obligation' }[locale];
    const ctaLabel = { de: 'Anfrage senden', en: 'Send request' }[locale];
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
