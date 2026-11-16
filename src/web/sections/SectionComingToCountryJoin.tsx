import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { Button } from '../components/base/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/base/card';
import { ExpansionMarketFlag } from '../components/ExpansionMarketFlag';
import { useT } from '../hooks/useT';

export function SectionComingToCountryJoin({ market }: { market: ExpansionMarket }) {
    const { t } = useT('public');

    const benefits = [
        { name: t('comingTo.benefitReady'), description: t('comingTo.benefitReadyBody') },
        { name: t('comingTo.benefitNetwork'), description: t('comingTo.benefitNetworkBody') },
        { name: t('comingTo.benefitCities'), description: t('comingTo.benefitCitiesBody') },
        { name: t('comingTo.benefitSupport'), description: t('comingTo.benefitSupportBody') },
    ];

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <Card className="overflow-hidden pt-0">
                <ExpansionMarketFlag market={market} variant="panel" />
                <div className="grid @lg:grid-cols-2 @lg:items-start">
                    <CardHeader>
                        <CardTitle className="font-serif text-3xl font-light tracking-tight @md:text-5xl">
                            <h2>{t('comingTo.joinTitle')}</h2>
                        </CardTitle>
                        <CardDescription className="text-base/7">{t('comingTo.joinIntro')}</CardDescription>
                        <div className="pt-2">
                            <Button asChild size="lg">
                                <Link to="/{-$locale}/how-to-become-a-chef/$country" params={{ country: market.slug }}>
                                    {t('comingTo.howToFounding')}
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="@lg:pt-6">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-8 @sm:grid-cols-2">
                            {benefits.map((benefit) => (
                                <div className="border-t border-border pt-4" key={benefit.name}>
                                    <dt className="font-medium text-foreground">{benefit.name}</dt>
                                    <dd className="mt-2 text-sm text-muted-foreground">{benefit.description}</dd>
                                </div>
                            ))}
                        </dl>
                    </CardContent>
                </div>
            </Card>
        </section>
    );
}
