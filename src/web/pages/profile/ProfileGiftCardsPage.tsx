import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { CustomerGiftCardCard } from '../../components/CustomerGiftCardCard';
import type { GqlCProfileGiftCardsPageQuery, GqlCProfileGiftCardsPageUserFragment } from '../../graphql/generated';
import { ProfileGiftCardsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { customerNavRouteBySlug } from './customerCatalog';

const route = customerNavRouteBySlug('gift-cards');

export const profileGiftCardsPageTitle = route.title;
export const profileGiftCardsPageDescription = route.description;

export function ProfileGiftCardsPage({ data }: { data: GqlCProfileGiftCardsPageQuery }) {
    const locale = useLocale();
    const seedUser = (data.currentSession.user ?? null) as GqlCProfileGiftCardsPageUserFragment | null;
    const user = useUserUpdatesSeed(seedUser, ProfileGiftCardsPageUpdatesDocument);
    const giftCards = user?.giftCards ?? [];

    const buyAction = (
        <Button asChild variant="outline" size="sm">
            <Link to="/{-$locale}/gift-card">{t(locale, 'profileCustomer', 'giftCards.buy')}</Link>
        </Button>
    );

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            {giftCards.length === 0 ? (
                <StatusAlert tone="info" title={t(locale, 'profileCustomer', 'giftCards.emptyTitle')} action={buyAction}>
                    {t(locale, 'profileCustomer', 'giftCards.emptyBody')}
                </StatusAlert>
            ) : (
                <>
                    <StatusAlert tone="info" title={t(locale, 'profileCustomer', 'giftCards.another')} action={buyAction}>
                        {t(locale, 'profileCustomer', 'giftCards.anotherBody')}
                    </StatusAlert>
                    <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                        {giftCards.map((giftCard) => (
                            <li key={giftCard.giftCardId} className="min-w-0">
                                <CustomerGiftCardCard giftCard={giftCard} />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </main>
    );
}
