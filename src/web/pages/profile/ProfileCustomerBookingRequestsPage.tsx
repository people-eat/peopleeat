import { Link } from '@tanstack/react-router';

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
                    title={{ de: 'Dein erstes Dinner bei dir?', en: 'Your first dinner at home?' }[locale]}
                    action={
                        <Button asChild variant="outline" size="sm">
                            <Link to="/{-$locale}/booking-request/form">
                                {{ de: 'Buchungsanfrage starten', en: 'Start a booking request' }[locale]}
                            </Link>
                        </Button>
                    }
                >
                    {
                        {
                            de: 'Erzähl uns von Anlass, Termin und Gästen. Wir finden den passenden Koch.',
                            en: 'Tell us the occasion, date, and guests. We’ll find the right chef.',
                        }[locale]
                    }
                </StatusAlert>
            ) : (
                <>
                    <StatusAlert
                        tone="info"
                        title={{ de: 'Schon den nächsten Anlass im Blick?', en: 'Already eyeing the next occasion?' }[locale]}
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to="/{-$locale}/booking-request/form">
                                    {{ de: 'Neue Buchungsanfrage', en: 'New booking request' }[locale]}
                                </Link>
                            </Button>
                        }
                    >
                        {
                            {
                                de: 'Geburtstag, Abend mit Freunden oder Team-Event: starte eine neue Anfrage, sobald der Termin feststeht.',
                                en: 'Birthday, friends’ night, or team event: start a new request as soon as the date is set.',
                            }[locale]
                        }
                    </StatusAlert>
                    <ul className="grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @8xl:grid-cols-6">
                        {requests.map((request) => (
                            <li key={request.bookingRequestId} className="min-w-0">
                                <CustomerBookingRequestCard request={request} />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </main>
    );
}
