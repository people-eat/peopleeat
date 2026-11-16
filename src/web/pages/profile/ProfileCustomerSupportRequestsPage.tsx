import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
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
                {supportRequests.length === 0 ? t(locale, 'profileCustomer', 'support.start') : t(locale, 'profileCustomer', 'support.new')}
            </Link>
        </Button>
    );

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            {supportRequests.length === 0 ? (
                <StatusAlert tone="info" title={t(locale, 'profileCustomer', 'support.needHelp')} action={startAction}>
                    {t(locale, 'profileCustomer', 'support.needHelpBody')}
                </StatusAlert>
            ) : (
                <>
                    <StatusAlert tone="info" title={t(locale, 'profileCustomer', 'support.anotherQuestion')} action={startAction}>
                        {t(locale, 'profileCustomer', 'support.anotherQuestionBody')}
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
