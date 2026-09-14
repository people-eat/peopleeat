import { Link } from '@tanstack/react-router';

import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useLocale } from '../hooks/useLocale';

function ComparisonPanel() {
    const locale = useLocale();

    const peopleEatOption = {
        title: { de: 'Mit peopleeat bei dir Zuhause', en: 'With peopleeat at your home' }[locale],
        bulletPoints: {
            de: [
                'Ein Menü nach deinen Wünschen und Vorlieben',
                'Trinke deine Lieblingsgetränke',
                'Gemütlich, ein besonderer Abend, an deinem Wunschdatum',
            ],
            en: [
                'A menu tailored to your wishes and preferences',
                'Enjoy your favorite drinks',
                'A cozy, special evening on your chosen date',
            ],
        }[locale],
    };

    const restaurantOption = {
        title: { de: 'Im Restaurant', en: 'In the restaurant' }[locale],
        bulletPoints: {
            de: ['Gerichte nach Menükarte', '200% Aufschlag bei den Getränken', 'Öffentlich zu festgelegten Öffnungszeiten'],
            en: ['Menu-ordered dishes', '200% surcharge on drinks', 'Open to the public during set opening hours'],
        }[locale],
    };

    return (
        <div className="flex flex-col gap-8 px-4 py-8 @md:p-8">
            <div>
                <h2 className="mb-2 font-serif text-2xl font-light @md:text-3xl">
                    {
                        {
                            de: 'Tausche einen Restaurantbesuch gegen einen Abend mit einem Privatkoch',
                            en: 'Swap a restaurant visit for an evening with a private chef',
                        }[locale]
                    }
                </h2>
                <p className="text-muted-foreground">
                    {
                        {
                            de: 'Zum Beispiel: Ein Abend mit 5 Freunden, einem Drei-Gänge-Menü und deinem besonderen Anlass',
                            en: 'For example: An evening with 5 friends, a three-course meal, and your special occasion',
                        }[locale]
                    }
                </p>
            </div>
            <div className="flex">
                <div className="relative z-10 min-w-0 flex-[1.05] rounded-xl border border-border bg-background px-4 py-6 shadow-md @md:flex-1 @md:p-6">
                    <h3 className="mb-6 text-lg font-medium @md:text-xl">{peopleEatOption.title}</h3>
                    <ul className="mb-8 space-y-4">
                        {peopleEatOption.bulletPoints.map((bulletPoint) => (
                            <li className="text-foreground/80" key={bulletPoint}>
                                {bulletPoint}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="min-w-0 flex-[1.15] self-stretch py-4 @md:flex-1">
                    <div className="h-full rounded-r-xl border border-border bg-muted/40 px-4 py-6 shadow-md @md:p-6">
                        <h3 className="mb-6 text-lg font-medium @md:text-xl">{restaurantOption.title}</h3>
                        <ul className="space-y-4">
                            {restaurantOption.bulletPoints.map((bulletPoint) => (
                                <li className="text-muted-foreground" key={bulletPoint}>
                                    {bulletPoint}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            <div className="flex justify-center">
                <Button asChild size="lg">
                    <Link to="/{-$locale}/booking-request/form">
                        {{ de: 'Unverbindlich anfragen', en: 'Request without obligation' }[locale]}
                    </Link>
                </Button>
            </div>
        </div>
    );
}

function SceneCaption() {
    const locale = useLocale();

    return (
        <div className="flex items-center gap-2 text-white">
            <span className="text-sm">
                {
                    {
                        de: (
                            <>
                                Daniels Geburtstagsfeier <br /> mit Privatkoch Max
                            </>
                        ),
                        en: (
                            <>
                                Daniel&apos;s birthday party <br /> with private chef Max
                            </>
                        ),
                    }[locale]
                }
            </span>
            <img
                alt={{ de: 'Bild von Privatkoch Max', en: 'Photo of private chef Max' }[locale]}
                className="size-16 rounded-full object-cover object-center shadow-lg shadow-white"
                height={64}
                src="/home/comparison-section/private-chef-max.jpg"
                width={64}
            />
        </div>
    );
}

export function SectionComparison() {
    const locale = useLocale();
    const sceneAlt = {
        de: 'Freunde sitzen beim Abendessen, genießen ein Glas Wein und lachen gemeinsam.',
        en: 'Friends sit at dinner, enjoy a glass of wine, and laugh together.',
    }[locale];

    return (
        <section>
            {/* Desktop: panel left, caption pinned bottom-right over the scene */}
            <Reveal className="relative hidden w-full overflow-hidden @lg:block" overMedia>
                <img
                    alt={sceneAlt}
                    className="absolute inset-0 size-full object-cover object-center"
                    height={800}
                    src="/home/comparison-section/dinner-mixed-friend-group.png"
                    width={1200}
                />
                <div className="relative top-0 flex w-full justify-center py-8">
                    <div className="flex max-w-7xl items-stretch justify-center">
                        <div className="flex-1 rounded-xl bg-background">
                            <ComparisonPanel />
                        </div>
                        <div className="flex h-full flex-1 items-end justify-end p-8">
                            <SceneCaption />
                        </div>
                    </div>
                </div>
            </Reveal>

            {/* Mobile: panel stacked above scene; caption bottom-right of photo */}
            <div className="flex flex-col gap-8 @lg:hidden">
                <Reveal>
                    <ComparisonPanel />
                </Reveal>
                <Reveal className="relative w-full overflow-hidden" overMedia>
                    <img
                        alt={sceneAlt}
                        className="absolute inset-0 size-full object-cover object-center"
                        height={800}
                        src="/home/comparison-section/dinner-mixed-friend-group.png"
                        width={1200}
                    />
                    <div className="relative top-0 flex w-full justify-center py-8">
                        <div className="flex h-full flex-1 items-end justify-end p-8 pt-48">
                            <SceneCaption />
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
