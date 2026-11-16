import { AppImage } from '../components/AppImage';
import { useT } from '../hooks/useT';

export function SectionHowWeStarted() {
    const { t } = useT('public');

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="mx-auto grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-16 @sm:gap-y-24 @lg:mx-0 @lg:max-w-none @lg:grid-cols-2">
                <div className="@lg:pr-4">
                    <AppImage
                        priority
                        alt={t('about.foundersAlt')}
                        className="w-full rounded-3xl object-cover"
                        height={800}
                        src="/about-us/how-we-started-section/founders.webp"
                        width={1000}
                    />
                </div>
                <div>
                    <div className="text-base/7 text-muted-foreground @lg:max-w-lg">
                        <p className="text-sm font-semibold text-muted-foreground">{t('about.startedKicker')}</p>
                        <h1 className="mt-2 font-serif text-3xl font-light tracking-tight text-foreground @sm:text-4xl">
                            {t('about.startedHeadline')}
                        </h1>
                        <div className="max-w-xl">
                            <p className="mt-6">
                                {t('about.startedIntro')}
                                <br />
                                <br />
                                {t('about.startedBody')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
