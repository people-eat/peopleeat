import { Link } from '@tanstack/react-router';

import { AutoplayVideo } from '../components/AutoplayVideo';
import { Button } from '../components/base/button';
import { useT } from '../hooks/useT';

type Experience = {
    title: string;
    description: string;
    videoUrl: string;
    buttonTitle: string;
    to: '/{-$locale}/booking-request/form' | '/{-$locale}/gift-card';
    alternativeText: string;
};

export function SectionExperienceSelection() {
    const { t } = useT('public');

    const experiences: Experience[] = [
        {
            title: t('home.experience.casualTitle'),
            description: t('home.experience.casualBody'),
            videoUrl: '/home/experience-selection-section/dinner-girls-friend-group.mp4',
            buttonTitle: t('home.experience.casualCta'),
            to: '/{-$locale}/booking-request/form',
            alternativeText: t('home.experience.casualAlt'),
        },
        {
            title: t('home.experience.signatureTitle'),
            description: t('home.experience.signatureBody'),
            videoUrl: '/home/experience-selection-section/dinner-old-couple.mp4',
            buttonTitle: t('home.experience.signatureCta'),
            to: '/{-$locale}/booking-request/form',
            alternativeText: t('home.experience.signatureAlt'),
        },
        {
            title: t('home.experience.giftTitle'),
            description: t('home.experience.giftBody'),
            videoUrl: '/home/experience-selection-section/gift-card.mp4',
            buttonTitle: t('home.experience.giftCta'),
            to: '/{-$locale}/gift-card',
            alternativeText: t('home.experience.giftAlt'),
        },
    ];

    return (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-16">
            <h2 className="mx-auto max-w-5xl text-center font-serif text-3xl font-extralight @md:text-6xl">{t('home.experience.intro')}</h2>

            <div className="grid gap-6 @md:grid-cols-3 @md:gap-8">
                {experiences.map((experience) => (
                    <article
                        className="group flex flex-col overflow-hidden rounded-lg bg-secondary transition-shadow hover:shadow-lg"
                        key={experience.title}
                    >
                        <AutoplayVideo
                            src={experience.videoUrl}
                            className="rounded-lg transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        >
                            <p>{experience.alternativeText}</p>
                        </AutoplayVideo>
                        <div className="flex grow flex-col p-4 @md:p-6">
                            <h3 className="mb-2 font-serif text-xl font-normal">{experience.title}</h3>
                            <p className="mb-4 grow font-normal text-muted-foreground">{experience.description}</p>
                            <div className="flex items-end justify-end">
                                <Button asChild variant="outline">
                                    <Link to={experience.to}>{experience.buttonTitle}</Link>
                                </Button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
