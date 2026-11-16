import { expansionMarketInCountryPhrase } from '../../shared/expansionMarkets';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { AppImage } from '../components/AppImage';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export function SectionBenefitsForChefs({ market }: { market?: ExpansionMarket }) {
    const locale = useLocale();
    const { t } = useT('public');
    const inCountry = market ? expansionMarketInCountryPhrase(market, locale) : '';

    const benefits = market
        ? [
              { name: t('howToBecome.marketEarly'), description: t('howToBecome.marketEarlyBody', { inCountry }) },
              { name: t('howToBecome.marketLaunch'), description: t('howToBecome.marketLaunchBody') },
              { name: t('howToBecome.marketNetwork'), description: t('howToBecome.marketNetworkBody') },
              { name: t('howToBecome.marketCities'), description: t('howToBecome.marketCitiesBody') },
              { name: t('howToBecome.marketCare'), description: t('howToBecome.marketCareBody') },
              { name: t('howToBecome.benefitFlexible'), description: t('howToBecome.benefitFlexibleBody') },
          ]
        : [
              { name: t('howToBecome.benefitFlexible'), description: t('howToBecome.benefitFlexibleBody') },
              { name: t('howToBecome.benefitCreative'), description: t('howToBecome.benefitCreativeBody') },
              { name: t('howToBecome.benefitPay'), description: t('howToBecome.benefitPayBody') },
              { name: t('howToBecome.benefitSupport'), description: t('howToBecome.benefitSupportBody') },
              { name: t('howToBecome.benefitDirect'), description: t('howToBecome.benefitDirectBody') },
              { name: t('howToBecome.benefitChat'), description: t('howToBecome.benefitChatBody') },
          ];

    return (
        <section className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-x-8 gap-y-16 px-4 @sm:px-6 @lg:max-w-7xl @lg:grid-cols-2 @lg:px-8">
            <div>
                <h2 className="font-serif text-3xl font-light tracking-tight text-foreground @sm:text-6xl">
                    {t('howToBecome.benefitsTitle')}
                </h2>
                <p className="mt-8 text-muted-foreground">{t('howToBecome.benefitsIntro')}</p>

                <dl className="mt-16 grid grid-cols-1 gap-x-6 gap-y-10 @sm:grid-cols-2 @sm:gap-y-16 @lg:gap-x-8">
                    {benefits.map((benefit) => (
                        <div className="border-t border-border pt-4" key={benefit.name}>
                            <dt className="font-medium text-foreground">{benefit.name}</dt>
                            <dd className="mt-2 text-sm text-muted-foreground">{benefit.description}</dd>
                        </div>
                    ))}
                </dl>
            </div>
            <div>
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                    <AppImage
                        alt={t('howToBecome.benefitsAlt1')}
                        aria-hidden
                        className="size-full object-cover object-center"
                        height={800}
                        src="/how-to-become-a-chef/benefits-for-chefs-section/1.webp"
                        width={800}
                    />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 @sm:mt-6 @sm:gap-6 @lg:mt-8 @lg:gap-8">
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                        <AppImage
                            alt={t('howToBecome.benefitsAlt2')}
                            aria-hidden
                            className="size-full object-cover object-center"
                            height={600}
                            src="/how-to-become-a-chef/benefits-for-chefs-section/2.webp"
                            width={600}
                        />
                    </div>
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                        <AppImage
                            alt={t('howToBecome.benefitsAlt3')}
                            aria-hidden
                            className="size-full object-cover object-center"
                            height={600}
                            src="/how-to-become-a-chef/benefits-for-chefs-section/3.webp"
                            width={600}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
