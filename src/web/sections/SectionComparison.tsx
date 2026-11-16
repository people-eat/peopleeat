import { Link } from '@tanstack/react-router';

import { AppImage } from '../components/AppImage';
import { Button } from '../components/base/button';
import { Reveal } from '../components/Reveal';
import { useT } from '../hooks/useT';

function ComparisonPanel() {
    const { t } = useT('public');

    const peopleEatOption = {
        title: t('home.comparison.peopleeatTitle'),
        bulletPoints: [t('home.comparison.peopleeat1'), t('home.comparison.peopleeat2'), t('home.comparison.peopleeat3')],
    };

    const restaurantOption = {
        title: t('home.comparison.restaurantTitle'),
        bulletPoints: [t('home.comparison.restaurant1'), t('home.comparison.restaurant2'), t('home.comparison.restaurant3')],
    };

    return (
        <div className="flex flex-col gap-8 px-4 py-8 @md:p-8">
            <div>
                <h2 className="mb-2 font-serif text-2xl font-light @md:text-3xl">{t('home.comparison.headline')}</h2>
                <p className="text-muted-foreground">{t('home.comparison.example')}</p>
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
                    <Link to="/{-$locale}/booking-request/form">{t('home.comparison.cta')}</Link>
                </Button>
            </div>
        </div>
    );
}

function SceneCaption() {
    const { t } = useT('public');

    return (
        <div className="flex items-center gap-2 text-white">
            <span className="text-sm">
                {t('home.comparison.captionLine1')} <br /> {t('home.comparison.captionLine2')}
            </span>
            <AppImage
                alt={t('home.comparison.chefAlt')}
                className="size-16 rounded-full object-cover object-center shadow-lg shadow-white"
                height={64}
                src="/home/comparison-section/private-chef-max.webp"
                width={64}
            />
        </div>
    );
}

export function SectionComparison() {
    const { t } = useT('public');
    const sceneAlt = t('home.comparison.sceneAlt');

    return (
        <section>
            {/* Desktop: panel left, caption pinned bottom-right over the scene */}
            <Reveal className="relative hidden w-full overflow-hidden @lg:block" overMedia>
                <AppImage
                    alt={sceneAlt}
                    className="absolute inset-0 size-full object-cover object-center"
                    height={800}
                    src="/home/comparison-section/dinner-mixed-friend-group.webp"
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
                    <AppImage
                        alt={sceneAlt}
                        className="absolute inset-0 size-full object-cover object-center"
                        height={800}
                        src="/home/comparison-section/dinner-mixed-friend-group.webp"
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
