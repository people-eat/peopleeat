import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { SupportRequestCreateForm } from '../../components/SupportRequestCreateForm';
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
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCustomerSupportRequestsPageUpdatesDocument);
    const [showCreate, setShowCreate] = useState(false);

    const supportRequests = user?.supportRequests ?? [];
    const bookingOptions =
        user?.bookingRequests?.map((request) => ({
            bookingRequestId: request.bookingRequestId,
            occasion: request.occasion,
            dateTime: request.dateTime,
            hasSupportRequest: request.supportRequest != null,
        })) ?? [];

    const startAction = (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            {
                {
                    de: supportRequests.length === 0 ? 'Support-Anfrage starten' : 'Neue Support-Anfrage',
                    en: supportRequests.length === 0 ? 'Start a support request' : 'New support request',
                }[locale]
            }
        </Button>
    );

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            {showCreate ? (
                <SupportRequestCreateForm
                    bookingOptions={bookingOptions}
                    onCancel={() => setShowCreate(false)}
                    onCreated={(supportRequestId) => {
                        setShowCreate(false);
                        toast.success(
                            {
                                de: 'Support-Anfrage gesendet. Wir melden uns im Chat.',
                                en: 'Support request sent. We will reply in chat.',
                            }[locale],
                        );
                        void navigate({
                            to: '/{-$locale}/profile/support-requests/$supportRequestId',
                            params: { supportRequestId },
                        });
                    }}
                />
            ) : supportRequests.length === 0 ? (
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
                    <ul className="grid grid-cols-1 items-stretch gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                        {supportRequests.map((request) => (
                            <li key={request.supportRequestId} className="min-w-0">
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
