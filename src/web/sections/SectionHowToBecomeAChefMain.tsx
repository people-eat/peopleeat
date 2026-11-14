import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { AppImage } from '../components/AppImage';
import { Button } from '../components/base/button';
import { ExpansionMarketFlag } from '../components/ExpansionMarketFlag';
import { useLocale } from '../hooks/useLocale';

export function SectionHowToBecomeAChefMain({ isCook, market }: { isCook: boolean; market?: ExpansionMarket }) {
    const locale = useLocale();
    const signUpSearch = market ? { market: market.slug } : undefined;

    return (
        <section className="relative isolate overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 @lg:px-6">
                <div className="mx-auto max-w-2xl @lg:mx-0 @lg:grid @lg:max-w-none @lg:grid-cols-2 @lg:gap-x-16 @lg:gap-y-6 @xl:grid-cols-1 @xl:grid-rows-1 @xl:gap-x-8">
                    <div className="max-w-2xl @lg:col-span-2 @xl:col-auto">
                        {market ? (
                            <p className="mb-4 flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                                <ExpansionMarketFlag market={market} size="lg" />
                                {market.comingToTitle[locale]}
                            </p>
                        ) : null}
                        <h1 className="font-serif text-4xl font-light tracking-tight @sm:text-6xl">
                            {market ? (
                                market.foundingChefTitle[locale]
                            ) : (
                                <>
                                    {{ de: 'Koche deine Menüs.', en: 'Cook your menu.' }[locale]}
                                    <br />
                                    {{ de: 'In ihrer Küche.', en: 'In their kitchen.' }[locale]}
                                    <br />
                                    {{ de: 'Zu deinen Konditionen.', en: 'On your terms.' }[locale]}
                                </>
                            )}
                        </h1>
                    </div>
                    <div className="mt-6 max-w-xl @lg:mt-0 @xl:col-end-1 @xl:row-start-1">
                        <p className="text-lg/8 text-muted-foreground">
                            {market
                                ? {
                                      de: `Melde dich früh an, lege Profil und erstes Menü an, und sei ${market.inCountryDe} am ersten Tag startklar. Gastanfragen beginnen Anfang 2027. Gastgeber können dort noch nicht buchen.`,
                                      en: `Join early, set up your profile and first menu, and be ready ${market.inCountryEn} on day one. Guest requests start in early 2027. Hosts cannot book there yet.`,
                                  }[locale]
                                : {
                                      de: 'Hier lebst du die volle Freiheit und deine Leidenschaft. Du entscheidest nicht nur über den Geschmack, sondern auch die Preisgestaltung für deine Menükreationen und schaffst dabei unvergessliche Genussmomente.',
                                      en: 'Here you live out your passion with complete freedom. You decide not only on the taste, but also on the pricing of your menu creations, creating unforgettable moments of culinary delight.',
                                  }[locale]}
                        </p>
                        <div className="mt-10 flex items-center gap-x-6">
                            {isCook ? (
                                <Button asChild size="lg">
                                    <Link to="/{-$locale}/profile">
                                        {{ de: 'Zu deinem Kochprofil', en: 'To your chef profile' }[locale]}
                                    </Link>
                                </Button>
                            ) : (
                                <Button asChild size="lg">
                                    <Link to="/{-$locale}/chef-sign-up" search={signUpSearch}>
                                        {
                                            {
                                                de: market ? 'Jetzt als Gründungskoch anmelden' : 'Jetzt registrieren',
                                                en: market ? 'Join as a founding chef now' : 'Sign up now',
                                            }[locale]
                                        }
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    <AppImage
                        priority
                        alt=""
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
