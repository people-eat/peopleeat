import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { useLocale } from '../hooks/useLocale';
import { Button } from './base/button';
import { StatusAlert } from './base/status-alert';

export function BookingRequestMarketClosedNotice({ market }: { market: ExpansionMarket }) {
    const locale = useLocale();

    return (
        <StatusAlert
            tone="warning"
            title={
                {
                    de: `peopleeat kommt ${market.comingToPhraseDe} Anfang 2027`,
                    en: `peopleeat is coming ${market.comingToPhraseEn} in early 2027`,
                }[locale]
            }
            action={
                <Button type="button" asChild size="sm">
                    <Link to="/{-$locale}/coming-to/$country" params={{ country: market.slug }}>
                        {{ de: 'Mehr erfahren', en: 'Learn more' }[locale]}
                    </Link>
                </Button>
            }
        >
            {
                {
                    de: 'Für diese Adresse können wir noch keine Buchungsanfrage annehmen. Köche können sich jetzt anmelden.',
                    en: 'We cannot accept a booking request for this address yet. Chefs can join now.',
                }[locale]
            }
        </StatusAlert>
    );
}
