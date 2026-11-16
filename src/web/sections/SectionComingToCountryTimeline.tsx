import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export function SectionComingToCountryTimeline({ market }: { market: ExpansionMarket }) {
    const locale = useLocale();
    const { t } = useT('public');
    const inCountry = locale === 'de' ? market.inCountryDe : market.inCountryEn;

    const steps = [
        {
            date: t('comingTo.now'),
            name: t('comingTo.joinAsChef'),
            description: t('comingTo.joinAsChefBody', { inCountry }),
        },
        {
            date: t('comingTo.onboarding'),
            name: t('comingTo.weSupport'),
            description: t('comingTo.weSupportBody'),
        },
        {
            date: t('comingTo.early2027'),
            name: t('comingTo.hostsCanBook'),
            description: t('comingTo.hostsCanBookBody', { inCountry }),
        },
    ];

    return (
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 @lg:px-6">
            <div className="mx-auto max-w-2xl @lg:mx-0">
                <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">{t('comingTo.timelineTitle')}</h2>
                <p className="mt-6 text-lg/8 text-muted-foreground">{t('comingTo.timelineIntro')}</p>
            </div>
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 overflow-hidden @lg:mx-0 @lg:max-w-none @lg:grid-cols-3">
                {steps.map((item) => (
                    <div key={item.name}>
                        <p className="relative flex items-center text-sm/6 font-semibold text-foreground">
                            <svg aria-hidden="true" className="mr-4 size-1 flex-none" viewBox="0 0 4 4">
                                <circle cx={2} cy={2} fill="currentColor" r={2} />
                            </svg>
                            {item.date}
                            <span
                                aria-hidden="true"
                                className="absolute -ml-2 h-px w-screen -translate-x-full bg-foreground/10 @sm:-ml-4 @lg:static @lg:-mr-6 @lg:ml-8 @lg:w-auto @lg:flex-auto @lg:translate-x-0"
                            />
                        </p>
                        <p className="mt-6 text-lg/8 font-medium tracking-tight text-foreground">{item.name}</p>
                        <p className="mt-1 text-base/7 text-muted-foreground">{item.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
