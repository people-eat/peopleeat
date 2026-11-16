import { Link } from '@tanstack/react-router';

import { expansionMarketComingToTitle } from '../../shared/expansionMarkets';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { Button } from '../components/base/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/base/card';
import { ExpansionMarketFlag } from '../components/ExpansionMarketFlag';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export function SectionComingToCountryMain({ market }: { market: ExpansionMarket }) {
    const locale = useLocale();
    const { t } = useT('public');
    const inCountry = locale === 'de' ? market.inCountryDe : market.inCountryEn;
    const facts = [t('comingTo.fact1'), t('comingTo.fact2'), t('comingTo.fact3')];

    return (
        <section>
            <div className="mx-auto max-w-7xl px-4 @lg:px-6">
                <div className="grid items-start gap-10 @lg:grid-cols-2 @lg:gap-16">
                    <div className="flex flex-col gap-6">
                        <p className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                            <ExpansionMarketFlag market={market} size="lg" />
                            {t('comingTo.newMarket')}
                        </p>
                        <h1 className="font-serif text-4xl font-light tracking-tight @sm:text-6xl">
                            {expansionMarketComingToTitle(market, locale)}
                        </h1>
                        <p className="max-w-xl text-lg/8 text-muted-foreground">{t('comingTo.networkIntro', { inCountry })}</p>
                        <ol className="mt-2 max-w-xl divide-y divide-border border-y border-border">
                            {facts.map((fact, index) => (
                                <li key={fact} className="flex items-baseline gap-4 py-4">
                                    <span className="w-8 shrink-0 font-serif text-xl font-light text-muted-foreground">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="text-base/7 text-foreground">{fact}</span>
                                </li>
                            ))}
                        </ol>
                        <div className="mt-2">
                            <Button asChild size="lg">
                                <Link to="/{-$locale}/how-to-become-a-chef/$country" params={{ country: market.slug }}>
                                    {t('comingTo.joinFounding')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <Card className="overflow-hidden pt-0">
                        <ExpansionMarketFlag market={market} variant="panel" priority />
                        <CardHeader>
                            <CardTitle className="font-serif text-3xl font-light tracking-tight @md:text-4xl">
                                {t('comingTo.chefsFirst')}
                            </CardTitle>
                            <CardDescription className="text-base/7">{t('comingTo.chefsFirstBody')}</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </section>
    );
}
