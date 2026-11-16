import { Link } from '@tanstack/react-router';

import { inlineCopy } from '../../shared';
import { expansionMarketCityList, expansionMarketList } from '../../shared/expansionMarkets';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/base/card';
import { ExpansionMarketFlag } from '../components/ExpansionMarketFlag';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export function SectionExpansionMarkets() {
    const locale = useLocale();
    const { t } = useT('public');

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">{t('comingTo.expansionTitle')}</h2>
            <p className="mt-6 max-w-2xl text-lg/8 text-muted-foreground">{t('comingTo.expansionIntro')}</p>
            <ul className="mt-10 grid grid-cols-1 gap-6 @md:grid-cols-2">
                {expansionMarketList.map((market) => (
                    <li key={market.slug}>
                        <Link
                            to="/{-$locale}/coming-to/$country"
                            params={{ country: market.slug }}
                            className="block h-full rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                            <Card className="h-full overflow-hidden pt-0 transition-colors hover:bg-muted/50 active:bg-muted">
                                <ExpansionMarketFlag market={market} variant="panel" />
                                <CardHeader>
                                    <CardDescription className="flex items-center gap-2">
                                        <ExpansionMarketFlag market={market} />
                                        {t('comingTo.newMarket')}
                                    </CardDescription>
                                    <CardTitle className="font-serif text-2xl font-light tracking-tight @md:text-3xl">
                                        <h3>{inlineCopy(market.comingToTitle, locale)}</h3>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-1 flex-col gap-2">
                                    <p className="text-base/7 text-muted-foreground">{t('comingTo.chefsNowHosts2027')}</p>
                                    <p className="text-sm/6 text-muted-foreground">{expansionMarketCityList(market, locale)}</p>
                                </CardContent>
                                <CardFooter>
                                    <span className="text-sm font-medium text-foreground">
                                        {t('comingTo.learnMore')}
                                        <span aria-hidden className="ms-1">
                                            →
                                        </span>
                                    </span>
                                </CardFooter>
                            </Card>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
