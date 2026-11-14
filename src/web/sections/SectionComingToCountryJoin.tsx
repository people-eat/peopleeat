import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { Button } from '../components/base/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/base/card';
import { ExpansionMarketFlag } from '../components/ExpansionMarketFlag';
import { useLocale } from '../hooks/useLocale';

export function SectionComingToCountryJoin({ market }: { market: ExpansionMarket }) {
    const locale = useLocale();

    const benefits = [
        {
            name: { de: 'Profil zum Start', en: 'Ready at launch' }[locale],
            description: {
                de: 'Dein Profil und erstes Menü stehen, wenn Gastgeber buchen können.',
                en: 'Your profile and first menu are live when hosts can book.',
            }[locale],
        },
        {
            name: { de: 'Erstes lokales Netzwerk', en: 'First local network' }[locale],
            description: {
                de: 'Du gehörst zu den ersten Köchen vor Ort.',
                en: 'You are among the first chefs on the ground.',
            }[locale],
        },
        {
            name: { de: 'Erste Stadtseiten', en: 'First city pages' }[locale],
            description: {
                de: 'Zum Start heben wir Gründungsköche auf den Stadtseiten hervor.',
                en: 'At launch we highlight founding chefs on the city pages.',
            }[locale],
        },
        {
            name: { de: 'Direkte Betreuung', en: 'Direct support' }[locale],
            description: {
                de: 'Wir begleiten dich persönlich durch das Onboarding.',
                en: 'We support you personally through onboarding.',
            }[locale],
        },
    ];

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <Card className="overflow-hidden pt-0">
                <ExpansionMarketFlag market={market} variant="panel" />
                <div className="grid @lg:grid-cols-2 @lg:items-start">
                    <CardHeader>
                        <CardTitle className="font-serif text-3xl font-light tracking-tight @md:text-5xl">
                            <h2>{{ de: 'Als Gründungskoch beitreten', en: 'Join as a founding chef' }[locale]}</h2>
                        </CardTitle>
                        <CardDescription className="text-base/7">
                            {
                                {
                                    de: 'Vorteile für frühe Anmeldungen: bereit zum Start, erstes Netzwerk, Sichtbarkeit, direkte Betreuung.',
                                    en: 'Benefits for early registration: ready at launch, first network, visibility, direct support.',
                                }[locale]
                            }
                        </CardDescription>
                        <div className="pt-2">
                            <Button asChild size="lg">
                                <Link to="/{-$locale}/how-to-become-a-chef/$country" params={{ country: market.slug }}>
                                    {{ de: 'So wirst du Gründungskoch', en: 'How to become a founding chef' }[locale]}
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
