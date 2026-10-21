import { Link } from '@tanstack/react-router';

import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { SupportRequestSummaryCard } from '../../components/SupportRequestSummaryCard';
import type { GqlCProfileCustomerSupportRequestsPageQuery } from '../../graphql/generated';
import { ProfileCustomerSupportRequestsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { customerNavRouteBySlug } from './customerCatalog';

const route = customerNavRouteBySlug('support-requests');

export const profileCustomerSupportRequestsPageTitle = route.title;
export const profileCustomerSupportRequestsPageDescription = route.description;

export function ProfileCustomerSupportRequestsPage({ data }: { data: GqlCProfileCustomerSupportRequestsPageQuery }) {
    const locale = useLocale();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCustomerSupportRequestsPageUpdatesDocument);

    const supportRequests = user?.supportRequests ?? [];

    const startAction = (
        <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/{-$locale}/profile/support-requests/create">
                {
                    {
                        de: supportRequests.length === 0 ? 'Support-Anfrage starten' : 'Neue Support-Anfrage',
                        en: supportRequests.length === 0 ? 'Start a support request' : 'New support request',
                    }[locale]
                }
            </Link>
        </Button>
    );

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            {supportRequests.length === 0 ? (
                <StatusAlert tone="info" title={{ de: 'Brauchst du Hilfe?', en: 'Need help?' }[locale]} action={startAction}>
                    {
                        {
                            de: 'Stelle eine Frage zu Buchung, Zahlung oder deinem Event. Unser Team antwortet im Chat.',
                            en: 'Ask about booking, payment, or your event. Our team replies in chat.',
                        }[locale]
                    }
                </StatusAlert>
            ) : (
                <>
                    <StatusAlert tone="info" title={{ de: 'Noch eine Frage?', en: 'Another question?' }[locale]} action={startAction}>
                        {
                            {
                                de: 'Stelle eine neue Anfrage zu Buchung, Zahlung oder deinem Event. Unser Team antwortet im Chat.',
                                en: 'Start a new request about booking, payment, or your event. Our team replies in chat.',
                            }[locale]
                        }
                    </StatusAlert>
                    <ul className="grid auto-rows-fr grid-cols-1 gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3">
                        {supportRequests.map((request) => (
                            <li key={request.supportRequestId} className="min-h-0 min-w-0">
                                <SupportRequestSummaryCard
                                    request={request}
                                    to="/{-$locale}/profile/support-requests/$supportRequestId"
                                    params={{ supportRequestId: request.supportRequestId }}
                                />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </main>
    );
}
