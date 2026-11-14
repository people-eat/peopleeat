import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { Button } from '../components/base/button';
import { useLocale } from '../hooks/useLocale';

export function SectionReadyToBecomeAChef({ isCook, market }: { isCook: boolean; market?: ExpansionMarket }) {
    const locale = useLocale();
    const signUpSearch = market ? { market: market.slug } : undefined;

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">
                {market
                    ? {
                          de: (
                              <>
                                  Bist du bereit, Gründungskoch zu werden?
                                  <br />
                                  Profil jetzt. Gäste Anfang 2027.
                              </>
                          ),
                          en: (
                              <>
                                  Ready to become a founding chef?
                                  <br />
                                  Profile now. Guests in early 2027.
                              </>
                          ),
                      }[locale]
                    : {
                          de: (
                              <>
                                  Bist du bereit zu starten?
                                  <br />
                                  Werde Teil des am schnellsten wachsenden Kochnetzwerks.
                              </>
                          ),
                          en: (
                              <>
                                  Are you ready to get started?
                                  <br />
                                  Become part of the fastest-growing chef network.
                              </>
                          ),
                      }[locale]}
            </h2>
            <div className="mt-8 flex items-center gap-x-6">
                {isCook ? (
                    <Button asChild size="lg">
                        <Link to="/{-$locale}/profile">{{ de: 'Zu deinem Kochprofil', en: 'To your chef profile' }[locale]}</Link>
                    </Button>
                ) : (
                    <Button asChild size="lg">
                        <Link to="/{-$locale}/chef-sign-up" search={signUpSearch}>
                            {{ de: 'Jetzt registrieren', en: 'Sign up now' }[locale]}
                        </Link>
                    </Button>
                )}
            </div>
        </section>
    );
}
