import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { Button } from '../components/base/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/base/card';
import { ExpansionMarketFlag } from '../components/ExpansionMarketFlag';
import { useLocale } from '../hooks/useLocale';

export function SectionComingToCountryMain({ market }: { market: ExpansionMarket }) {
    const locale = useLocale();

    const facts = [
        { de: 'Köche können sich jetzt anmelden.', en: 'Chefs can join now.' },
        { de: 'Gastgeber können noch nicht buchen.', en: 'Hosts cannot book yet.' },
        { de: 'Start für Gäste: Anfang 2027.', en: 'Guest launch: early 2027.' },
    ];

    return (
        <section>
            <div className="mx-auto max-w-7xl px-4 @lg:px-6">
                <div className="grid items-start gap-10 @lg:grid-cols-2 @lg:gap-16">
                    <div className="flex flex-col gap-6">
                        <p className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                            <ExpansionMarketFlag market={market} size="lg" />
                            {{ de: 'Neuer Markt', en: 'New market' }[locale]}
                        </p>
                        <h1 className="font-serif text-4xl font-light tracking-tight @sm:text-6xl">{market.comingToTitle[locale]}</h1>
                        <p className="max-w-xl text-lg/8 text-muted-foreground">
                            {
                                {
                                    de: `Wir bauen zuerst das Koch-Netzwerk ${market.inCountryDe} auf. Gastgeber können Anfang 2027 buchen.`,
                                    en: `We are building the chef network ${market.inCountryEn} first. Hosts can book from early 2027.`,
                                }[locale]
                            }
                        </p>
                        <ol className="mt-2 max-w-xl divide-y divide-border border-y border-border">
                            {facts.map((fact, index) => (
                                <li key={fact.en} className="flex items-baseline gap-4 py-4">
                                    <span className="w-8 shrink-0 font-serif text-xl font-light text-muted-foreground">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="text-base/7 text-foreground">{fact[locale]}</span>
                                </li>
                            ))}
                        </ol>
                        <div className="mt-2">
                            <Button asChild size="lg">
                                <Link to="/{-$locale}/how-to-become-a-chef/$country" params={{ country: market.slug }}>
                                    {{ de: 'Als Gründungskoch beitreten', en: 'Join as a founding chef' }[locale]}
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <Card className="overflow-hidden pt-0">
                        <ExpansionMarketFlag market={market} variant="panel" priority />
                        <CardHeader>
                            <CardTitle className="font-serif text-3xl font-light tracking-tight @md:text-4xl">
                                {{ de: 'Köche zuerst.', en: 'Chefs first.' }[locale]}
                            </CardTitle>
                            <CardDescription className="text-base/7">
                                {
                                    {
                                        de: 'Profil und erstes Menü jetzt. Wenn Gastgeber Anfang 2027 buchen, bist du bereits startklar.',
                                        en: 'Profile and first menu now. When hosts book in early 2027, you are already ready.',
                                    }[locale]
                                }
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </section>
    );
}
