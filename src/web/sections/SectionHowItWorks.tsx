import type { UIEvent } from 'react';
import { useState } from 'react';

import { AppImage } from '../components/AppImage';
import { AutoplayVideo } from '../components/AutoplayVideo';
import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useT } from '../hooks/useT';
import { SITE_WHATSAPP_URL } from '../seo/seoConstants';
import { cn } from '../utils/cn';

type Step =
    | { id: number; title: string; description: string; image: string; alternativeText: string }
    | { id: number; title: string; description: string; video: string; alternativeText: string };

export function SectionHowItWorks({
    hideCta = false,
    useAlternativeMedia = false,
}: { hideCta?: boolean; useAlternativeMedia?: boolean } = {}) {
    const { t } = useT('public');
    const [activeIndex, setActiveIndex] = useState(0);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
        const scrollPosition = event.currentTarget.scrollLeft;
        const index = Math.round(scrollPosition / event.currentTarget.offsetWidth);
        setActiveIndex(index);
    }

    const steps: Step[] = [
        {
            id: 1,
            title: t('home.howItWorks.step1Title'),
            description: t('home.howItWorks.step1Body'),
            video: useAlternativeMedia
                ? '/home/how-it-works-section/ingredient-purchase.alternative.mp4'
                : '/home/how-it-works-section/ingredient-purchase.mp4',
            alternativeText: t('home.howItWorks.step1Alt'),
        },
        {
            id: 2,
            title: t('home.howItWorks.step2Title'),
            description: t('home.howItWorks.step2Body'),
            image: '/home/how-it-works-section/preparing-dinner.webp',
            alternativeText: t('home.howItWorks.step2Alt'),
        },
        {
            id: 3,
            title: t('home.howItWorks.step3Title'),
            description: t('home.howItWorks.step3Body'),
            ...(useAlternativeMedia
                ? { image: '/home/how-it-works-section/enjoying-dinner.alternative.webp' }
                : { video: '/home/how-it-works-section/enjoying-dinner.mp4' }),
            alternativeText: t('home.howItWorks.step3Alt'),
        },
        {
            id: 4,
            title: t('home.howItWorks.step4Title'),
            description: t('home.howItWorks.step4Body'),
            image: '/home/how-it-works-section/clean-kitchen.webp',
            alternativeText: t('home.howItWorks.step4Alt'),
        },
    ];

    const headline = useAlternativeMedia ? t('home.howItWorks.headlineAlt') : t('home.howItWorks.headline');
    const subheadline = t('home.howItWorks.subheadline');
    const ctaHeadline = (
        <>
            {t('home.howItWorks.ctaHeadline')}
            <br />
            {t('home.howItWorks.ctaCities')}
        </>
    );
    const ctaLabel = t('home.support.cta');

    return (
        <section className="px-4 py-16 @lg:px-6">
            <div className="mx-auto hidden max-w-7xl flex-col items-center gap-8 @lg:flex">
                <div className="grid w-full grid-cols-10 gap-x-8 gap-y-16">
                    <Reveal className="col-span-4 flex flex-col gap-4">
                        <h2 className="font-serif text-2xl font-light @md:text-3xl">{headline}</h2>
                        <p className="font-serif text-3xl font-light text-muted-foreground @md:text-4xl">{subheadline}</p>
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
                                <AppImage
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
                                            <AppImage
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
