import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { t } from '../../../i18n/t';
import { isNanoId } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { SupportRequestCreateForm } from '../../components/SupportRequestCreateForm';
import type { GqlCProfileCustomerSupportRequestsPageQuery } from '../../graphql/generated';
import { ProfileCustomerSupportRequestsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { customerNavRouteBySlug } from './customerCatalog';

const supportRequestsListRoute = customerNavRouteBySlug('support-requests');

export function profileCustomerSupportRequestCreatePageTitle(locale: Locale): string {
    return t(locale, 'profileCustomer', 'support.createTitle');
}
export function profileCustomerSupportRequestCreatePageDescription(locale: Locale): string {
    return t(locale, 'profileCustomer', 'support.createDescription');
}

export type ProfileCustomerSupportRequestCreateSearch = {
    bookingRequestId?: string;
};

export function parseProfileCustomerSupportRequestCreateSearch(search: Record<string, unknown>): ProfileCustomerSupportRequestCreateSearch {
    const raw = search.bookingRequestId;
    if (typeof raw === 'string' && isNanoId(raw)) {
        return { bookingRequestId: raw };
    }
    return {};
}

export function ProfileCustomerSupportRequestCreatePage({
    data,
    search,
}: {
    data: GqlCProfileCustomerSupportRequestsPageQuery;
    search: ProfileCustomerSupportRequestCreateSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCustomerSupportRequestsPageUpdatesDocument);

    const bookingOptions =
        user?.bookingRequests?.map((request) => ({
            bookingRequestId: request.bookingRequestId,
            occasion: request.occasion,
            dateTime: request.dateTime,
            hasSupportRequest: request.supportRequest != null,
        })) ?? [];

    const lockedBookingRequestId = search.bookingRequestId;
    const lockedBooking =
        lockedBookingRequestId != null
            ? (user?.bookingRequests?.find((request) => request.bookingRequestId === lockedBookingRequestId) ?? null)
            : null;
    const existingSupportRequestId = lockedBooking?.supportRequest?.supportRequestId ?? null;

    useEffect(() => {
        if (existingSupportRequestId == null) return;
        void navigate({
            to: '/{-$locale}/profile/support-requests/$supportRequestId',
            params: { supportRequestId: existingSupportRequestId },
            replace: true,
        });
    }, [existingSupportRequestId, navigate]);

    if (existingSupportRequestId != null) {
        return null;
    }

    const formLockedBookingRequestId = lockedBookingRequestId != null && lockedBooking != null ? lockedBookingRequestId : undefined;

    return (
        <main id="main-content" className="@container grid w-full min-w-0 max-w-xl content-start gap-6">
            <SupportRequestCreateForm
                lockedBookingRequestId={formLockedBookingRequestId}
                bookingOptions={formLockedBookingRequestId == null ? bookingOptions : undefined}
                onCancel={() => {
                    void navigate({ to: supportRequestsListRoute.to });
                }}
                onCreated={(supportRequestId) => {
                    toast.success(t(locale, 'profileCustomer', 'support.sent'));
                    void navigate({
                        to: '/{-$locale}/profile/support-requests/$supportRequestId',
                        params: { supportRequestId },
                    });
                }}
            />
        </main>
    );
}
