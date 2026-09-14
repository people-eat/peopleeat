import { Link } from '@tanstack/react-router';

import { AutoplayVideo } from '../components/AutoplayVideo';
import { Button } from '../components/base/button';
import { useLocale } from '../hooks/useLocale';

type Experience = {
    title: string;
    description: string;
    videoUrl: string;
    buttonTitle: string;
    to: '/{-$locale}/booking-request/form' | '/{-$locale}/gift-card';
    alternativeText: string;
};

export function SectionExperienceSelection() {
    const locale = useLocale();

    const experiences: Experience[] = [
        {
            title: 'Casual Dining',
            description: {
                de: 'Genieße einen entspannten Abend mit Freunden oder der Familie. Dein privater Koch bereitet einfache Gerichte zu, während bei familiärer Atmosphäre und einem Glas Wein gelacht und geplaudert wird.',
                en: 'Enjoy a relaxing evening with friends or family. Your private chef will prepare simple dishes while you laugh and chat in a family atmosphere with a glass of wine.',
            }[locale],
            videoUrl: '/home/experience-selection-section/dinner-girls-friend-group.mp4',
            buttonTitle: { de: 'ab 75€ / Person', en: 'from 75€ / person' }[locale],
            to: '/{-$locale}/booking-request/form',
            alternativeText: {
                de: 'Mädchen sitzen gemeinsam an einem Tisch mit Kerzen und genießen ein Abendessen.',
                en: 'Girls sitting together at a table with candles, enjoying a dinner.',
            }[locale],
        },
        {
            title: { de: 'Signature Menü', en: 'Signature menu' }[locale],
            description: {
                de: 'Besondere Momente verdienen ein eigenes exklusives Fine Dining Menü, zubereitet von einem Spitzenkoch. Ideal für Jubiläen, runde Geburtstage oder andere einzigartige Anlässe, die in Erinnerung bleiben.',
                en: 'Special moments deserve their own exclusive fine dining menu, prepared by a top chef. Ideal for anniversaries, milestone birthdays or other unique occasions that will be remembered.',
            }[locale],
            videoUrl: '/home/experience-selection-section/dinner-old-couple.mp4',
            buttonTitle: { de: 'ab 90€ / Person', en: 'from 90€ / person' }[locale],
            to: '/{-$locale}/booking-request/form',
            alternativeText: {
                de: 'Ein Paar genießt ein Candle-Light-Dinner, zubereitet von einem Spitzenkoch.',
                en: 'A couple enjoys a candlelight dinner prepared by a top chef.',
            }[locale],
        },
        {
            title: { de: 'Unvergessliches Geschenk', en: 'Unforgettable gift' }[locale],
            description: {
                de: 'Überrasche deine Liebsten mit einem besonderen Erlebnis. Ein ideales Geschenk für Geburtstage, für besondere Arbeitskollegen oder um einfach mal danke zu sagen.',
                en: 'Surprise your loved ones with a special experience. An ideal gift for birthdays, for special colleagues, or simply to say thank you.',
            }[locale],
            videoUrl: '/home/experience-selection-section/gift-card.mp4',
            buttonTitle: { de: 'Gutschein kaufen', en: 'Buy a voucher' }[locale],
            to: '/{-$locale}/gift-card',
            alternativeText: {
                de: 'Eine Gutscheinkarte von peopleeat für ein Dinner mit einem Privatkoch.',
                en: 'A peopleeat gift card for a dinner with a private chef.',
            }[locale],
        },
    ];

    return (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-16">
            <h2 className="mx-auto max-w-5xl text-center font-serif text-3xl font-extralight @md:text-6xl">
                {
                    {
                        de: 'peopleeat ist der Ort, an dem du in wenigen Schritten einen Privatkoch für einen Abend findest, köstliche Menüs entdeckst und ganz entspannt unvergessliche Momente am Tisch erlebst.',
                        en: 'peopleeat is the place where you can find a private chef for an evening in just a few steps, discover delicious menus and experience unforgettable moments at the table in a completely relaxed atmosphere.',
                    }[locale]
                }
            </h2>

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
