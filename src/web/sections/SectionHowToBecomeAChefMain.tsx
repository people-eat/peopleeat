import { Link } from '@tanstack/react-router';

import {
    expansionMarketComingToTitle,
    expansionMarketFoundingChefTitle,
    expansionMarketInCountryPhrase,
} from '../../shared/expansionMarkets';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { AppImage } from '../components/AppImage';
import { Button } from '../components/base/button';
import { ExpansionMarketFlag } from '../components/ExpansionMarketFlag';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export function SectionHowToBecomeAChefMain({ isCook, market }: { isCook: boolean; market?: ExpansionMarket }) {
    const locale = useLocale();
    const { t } = useT('public');
    const signUpSearch = market ? { market: market.slug } : undefined;
    const inCountry = market ? expansionMarketInCountryPhrase(market, locale) : '';

    return (
        <section className="relative isolate overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 @lg:px-6">
                <div className="mx-auto max-w-2xl @lg:mx-0 @lg:grid @lg:max-w-none @lg:grid-cols-2 @lg:gap-x-16 @lg:gap-y-6 @xl:grid-cols-1 @xl:grid-rows-1 @xl:gap-x-8">
                    <div className="max-w-2xl @lg:col-span-2 @xl:col-auto">
                        {market ? (
                            <p className="mb-4 flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                                <ExpansionMarketFlag market={market} size="lg" />
                                {expansionMarketComingToTitle(market, locale)}
                            </p>
                        ) : null}
                        <h1 className="font-serif text-4xl font-light tracking-tight @sm:text-6xl">
                            {market ? (
                                expansionMarketFoundingChefTitle(market, locale)
                            ) : (
                                <>
                                    {t('howToBecome.line1')}
                                    <br />
                                    {t('howToBecome.line2')}
                                    <br />
                                    {t('howToBecome.line3')}
                                </>
                            )}
                        </h1>
                    </div>
                    <div className="mt-6 max-w-xl @lg:mt-0 @xl:col-end-1 @xl:row-start-1">
                        <p className="text-lg/8 text-muted-foreground">
                            {market ? t('howToBecome.marketIntro', { inCountry }) : t('howToBecome.intro')}
                        </p>
                        <div className="mt-10 flex items-center gap-x-6">
                            {isCook ? (
                                <Button asChild size="lg">
                                    <Link to="/{-$locale}/profile">{t('howToBecome.toProfile')}</Link>
                                </Button>
                            ) : (
                                <Button asChild size="lg">
                                    <Link to="/{-$locale}/chef-sign-up" search={signUpSearch}>
                                        {market ? t('howToBecome.joinFoundingNow') : t('howToBecome.signUpNow')}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    <AppImage
                        priority
                        alt={t('howToBecome.heroChefAlt')}
                        className="mt-10 aspect-6/5 w-full max-w-lg select-none rounded-2xl object-cover @sm:mt-16 @lg:mt-0 @lg:max-w-none @xl:row-span-2 @xl:row-end-2 @xl:mt-36"
                        draggable={false}
                        height={400}
                        src="/how-to-become-a-chef/main-section/chef.webp"
                        width={500}
                    />
                </div>
            </div>
        </section>
    );
}
