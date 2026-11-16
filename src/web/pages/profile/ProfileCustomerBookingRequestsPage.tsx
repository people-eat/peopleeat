import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { CustomerBookingRequestCard } from '../../components/CustomerBookingRequestCard';
import type { GqlCProfileCustomerBookingRequestsPageQuery } from '../../graphql/generated';
import { ProfileCustomerBookingRequestsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { customerNavRouteBySlug } from './customerCatalog';

const route = customerNavRouteBySlug('booking-requests');

export const profileCustomerBookingRequestsPageTitle = route.title;
export const profileCustomerBookingRequestsPageDescription = route.description;

export function ProfileCustomerBookingRequestsPage({ data }: { data: GqlCProfileCustomerBookingRequestsPageQuery }) {
    const locale = useLocale();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCustomerBookingRequestsPageUpdatesDocument);

    const requests = user?.bookingRequests ?? [];

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            {requests.length === 0 ? (
                <StatusAlert
                    tone="info"
                    title={t(locale, 'profileCustomer', 'bookingRequests.emptyTitle')}
                    action={
                        <Button asChild variant="outline" size="sm">
                            <Link to="/{-$locale}/booking-request/form">{t(locale, 'profileCustomer', 'overview.startRequest')}</Link>
                        </Button>
                    }
                >
                    {t(locale, 'profileCustomer', 'overview.startRequestBody')}
                </StatusAlert>
            ) : (
                <>
                    <StatusAlert
                        tone="info"
                        title={t(locale, 'profileCustomer', 'overview.nextOccasionTitle')}
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to="/{-$locale}/booking-request/form">{t(locale, 'profileCustomer', 'overview.newRequest')}</Link>
                            </Button>
                        }
                    >
                        {t(locale, 'profileCustomer', 'overview.nextOccasionBody')}
                    </StatusAlert>
                    <ul className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 @md:grid-cols-2 @2xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @8xl:grid-cols-6">
                        {requests.map((request) => (
                            <li key={request.bookingRequestId} className="grid min-h-0 min-w-0">
                                <CustomerBookingRequestCard request={request} />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </main>
    );
}
