import type { UIEvent } from 'react';
import { useState } from 'react';

import { AutoplayVideo } from '../components/AutoplayVideo';
import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useLocale } from '../hooks/useLocale';
import { SITE_WHATSAPP_URL } from '../seo/seoConstants';
import { cn } from '../utils/cn';

type Step =
    | { id: number; title: string; description: string; image: string; alternativeText: string }
    | { id: number; title: string; description: string; video: string; alternativeText: string };

export function SectionHowItWorks({
    hideCta = false,
    useAlternativeMedia = false,
}: { hideCta?: boolean; useAlternativeMedia?: boolean } = {}) {
    const locale = useLocale();
    const [activeIndex, setActiveIndex] = useState(0);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
        const scrollPosition = event.currentTarget.scrollLeft;
        const index = Math.round(scrollPosition / event.currentTarget.offsetWidth);
        setActiveIndex(index);
    }

    const steps: Step[] = [
        {
            id: 1,
            title: { de: 'Das Menü wird vorbereitet', en: 'The menu is being prepared' }[locale],
            description: {
                de: 'Die Zutaten für das abgestimmte Menü werden sorgfältig ausgewählt und bei regionalen Händlern eingekauft.',
                en: 'The ingredients for the coordinated menu are carefully selected and purchased from regional suppliers.',
            }[locale],
            video: useAlternativeMedia
                ? '/home/how-it-works-section/ingredient-purchase.alternative.mp4'
                : '/home/how-it-works-section/ingredient-purchase.mp4',
            alternativeText: {
                de: 'Ein Privatkoch wählt frische Zutaten auf dem Markt aus.',
                en: 'A private chef selects fresh ingredients at the market.',
            }[locale],
        },
        {
            id: 2,
            title: { de: 'In deiner Küche', en: 'In your kitchen' }[locale],
            description: {
                de: 'Du verbringst die Zeit mit deinen Gästen, während das Menü von deinem Chefkoch zubereitet wird.',
                en: 'You spend time with your guests while your chef prepares the menu.',
            }[locale],
            image: '/home/how-it-works-section/preparing-dinner.jpeg',
            alternativeText: {
                de: 'Ein Privatkoch zaubert Lachstatar als Vorspeise beim Kunden zu Hause.',
                en: "A private chef prepares salmon tartare as a starter at the customer's home.",
            }[locale],
        },
        {
            id: 3,
            title: { de: 'Lehn dich zurück', en: 'Sit back and relax' }[locale],
            description: {
                de: 'Genieße das Menü, lass dich Gang für Gang kulinarisch verwöhnen und kreiere unvergessliche Momente.',
                en: 'Enjoy the menu, let yourself be pampered with culinary delights course after course, and create unforgettable moments.',
            }[locale],
            ...(useAlternativeMedia
                ? { image: '/home/how-it-works-section/enjoying-dinner.alternative.jpg' }
                : { video: '/home/how-it-works-section/enjoying-dinner.mp4' }),
            alternativeText: {
                de: 'Familie sitzt am dekorierten Tisch und genießt ein Menü vom Privatkoch zu Hause.',
                en: 'A family sits at a decorated table and enjoys a private chef menu at home.',
            }[locale],
        },
        {
            id: 4,
            title: { de: 'Eine saubere Küche danach', en: 'A clean kitchen afterwards' }[locale],
            description: {
                de: 'Du lässt den Abend ausklingen, während dein Koch die letzten Handgriffe in der Küche erledigt.',
                en: 'You let the evening wind down while your cook finishes up the last tasks in the kitchen.',
            }[locale],
            image: '/home/how-it-works-section/clean-kitchen.png',
            alternativeText: {
                de: 'Ein Tisch wird mit einem gelben Schwamm gereinigt.',
                en: 'A table is cleaned with a yellow sponge.',
            }[locale],
        },
    ];

    const headline = {
        de: useAlternativeMedia ? 'Dein Erlebnis in vier Schritten' : 'Deine Experience in vier Schritten',
        en: 'Your experience in 4 steps',
    }[locale];
    const subheadline = { de: 'Ohne dass du in der Küche stehen musst', en: 'Without having to stand in the kitchen' }[locale];
    const ctaHeadline = {
        de: (
            <>
                Das nächste Dinner bei dir?
                <br />
                Bereits in über 100 Städten verfügbar
            </>
        ),
        en: (
            <>
                How about dinner at your place next time?
                <br />
                Already available in over 100 cities
            </>
        ),
    }[locale];
    const ctaLabel = { de: 'Kontaktiere uns', en: 'Contact us' }[locale];

    return (
        <section className="px-4 py-16 @lg:px-6">
            <div className="mx-auto hidden max-w-7xl flex-col items-center gap-8 @lg:flex">
                <div className="grid w-full grid-cols-10 gap-x-8 gap-y-16">
                    <Reveal className="col-span-4 flex flex-col gap-4">
                        <h2 className="font-serif text-2xl font-light @md:text-3xl">{headline}</h2>
                        <p className="font-serif text-3xl font-light text-muted-foreground @md:text-5xl">{subheadline}</p>
                    </Reveal>

                    {steps.map((step, index) => (
                        <Reveal className="col-span-3 flex h-full flex-col justify-between gap-4" index={index} key={step.id}>
                            <div className="flex size-10 items-center justify-center rounded-md bg-foreground text-sm text-background">
                                {`0${step.id}`}
                            </div>
                            <div>
                                <h3 className="text-lg font-medium">{step.title}</h3>
                                <p className="mb-4 text-muted-foreground">{step.description}</p>
                            </div>
                            <span className="flex-1" />
                            {'image' in step ? (
                                <img
                                    alt={step.alternativeText}
                                    className="h-[500px] w-full rounded-lg object-cover"
                                    height={500}
                                    src={step.image}
                                    width={400}
                                />
                            ) : (
                                <AutoplayVideo src={step.video} className="h-[500px] w-full rounded-lg object-cover">
                                    {step.alternativeText}
                                </AutoplayVideo>
                            )}
                        </Reveal>
                    ))}

                    {!hideCta ? (
                        <Reveal className="col-span-4 flex flex-col gap-4">
                            <h2 className="mb-4 font-serif text-2xl font-light">{ctaHeadline}</h2>
                            <div>
                                <Button asChild variant="outline">
                                    <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                                        {ctaLabel}
                                    </a>
                                </Button>
                            </div>
                        </Reveal>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-col gap-8 @lg:hidden">
                <Reveal className="flex w-full max-w-7xl flex-col gap-4">
                    <h2 className="font-serif text-2xl font-light">{headline}</h2>
                    <p className="font-serif text-3xl font-light text-muted-foreground">{subheadline}</p>
                </Reveal>

                <div className="w-full">
                    <div className="flex snap-x snap-mandatory overflow-x-auto" onScroll={handleScroll}>
                        {steps.map((step) => (
                            <div className="mx-auto w-[90%] shrink-0 snap-center p-4" key={step.id}>
                                <div className="flex flex-col gap-4 p-4">
                                    <div className="relative">
                                        <div className="absolute top-2.5 left-2.5 z-10 flex size-10 items-center justify-center rounded-md bg-foreground text-sm text-background">
                                            {`0${step.id}`}
                                        </div>
                                        {'image' in step ? (
                                            <img
                                                alt={step.alternativeText}
                                                className="h-[500px] w-full rounded-lg object-cover"
                                                height={500}
                                                src={step.image}
                                                width={400}
                                            />
                                        ) : (
                                            <AutoplayVideo src={step.video} className="h-[500px] w-full rounded-lg object-cover">
                                                {step.alternativeText}
                                            </AutoplayVideo>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-medium">{step.title}</h3>
                                        <p className="text-muted-foreground">{step.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex justify-center space-x-2" aria-hidden>
                        {steps.map((step, index) => (
                            <div
                                className={cn('size-2 rounded-full', activeIndex === index ? 'bg-foreground' : 'bg-muted-foreground/40')}
                                key={step.id}
                            />
                        ))}
                    </div>
                </div>

                {!hideCta ? (
                    <Reveal className="flex w-full max-w-7xl flex-col gap-4">
                        <h2 className="mb-4 font-serif text-2xl font-light">{ctaHeadline}</h2>
                        <div>
                            <Button asChild variant="outline">
                                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                                    {ctaLabel}
                                </a>
                            </Button>
                        </div>
                    </Reveal>
                ) : null}
            </div>
        </section>
    );
}
