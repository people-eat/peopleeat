import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { Button } from './base/button';
import { StatusAlert } from './base/status-alert';

export function BookingRequestMarketClosedNotice({ market }: { market: ExpansionMarket }) {
    const locale = useLocale();
    const { t } = useT('publicBooking');
    const comingTo = locale === 'de' ? market.comingToPhraseDe : market.comingToPhraseEn;

    return (
        <StatusAlert
            tone="warning"
            title={t('marketClosed.title', { comingTo })}
            action={
                <Button type="button" asChild size="sm">
                    <Link to="/{-$locale}/coming-to/$country" params={{ country: market.slug }}>
                        {t('marketClosed.learnMore')}
                    </Link>
                </Button>
            }
        >
            {t('marketClosed.body')}
        </StatusAlert>
    );
}
