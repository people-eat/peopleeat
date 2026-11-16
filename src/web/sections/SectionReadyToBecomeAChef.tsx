import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { Button } from '../components/base/button';
import { useT } from '../hooks/useT';

export function SectionReadyToBecomeAChef({ isCook, market }: { isCook: boolean; market?: ExpansionMarket }) {
    const { t } = useT('public');
    const signUpSearch = market ? { market: market.slug } : undefined;

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="max-w-3xl">
                <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">
                    {market ? (
                        <>
                            {t('howToBecome.foundingHeadline')}
                            <br />
                            {t('howToBecome.foundingSubheadline')}
                        </>
                    ) : (
                        <>
                            {t('howToBecome.readyHeadline')}
                            <br />
                            {t('howToBecome.readySubheadline')}
                        </>
                    )}
                </h2>
                <div className="mt-8 flex items-center gap-x-6">
                    {isCook ? (
                        <Button asChild size="lg">
                            <Link to="/{-$locale}/profile">{t('howToBecome.toProfile')}</Link>
                        </Button>
                    ) : (
                        <Button asChild size="lg">
                            <Link to="/{-$locale}/chef-sign-up" search={signUpSearch}>
                                {t('howToBecome.signUpNow')}
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
