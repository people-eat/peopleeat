import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useMutation } from 'urql';

import { StatusBadge } from '../../components/base/status-badge';
import { SupportRequestChat } from '../../components/SupportRequestChat';
import type { GqlCProfileCustomerSupportRequestPageQuery } from '../../graphql/generated';
import {
    ProfileCustomerSupportRequestPageUpdatesDocument,
    ProfileSupportRequestMessageCreateDocument,
    ProfileSupportRequestUnreadNotificationCountResetDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { customerNavRouteBySlug } from './customerCatalog';

const supportRequestsListRoute = customerNavRouteBySlug('support-requests');

export {
    profileCustomerSupportRequestPageDescription,
    profileCustomerSupportRequestPageTitle,
} from './profileCustomerSupportRequestLabels';

export function profileCustomerSupportRequestPageVariables(supportRequestId: string) {
    return { supportRequestId };
}

export function ProfileCustomerSupportRequestPage({
    data,
    supportRequestId,
}: {
    data: GqlCProfileCustomerSupportRequestPageQuery;
    supportRequestId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const seedRequest = seedUser?.supportRequest ?? null;
    if (!seedRequest) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCustomerSupportRequestPageUpdatesDocument, { supportRequestId });
    const supportRequest = user?.supportRequest ?? null;

    const [, sendMessage] = useMutation(ProfileSupportRequestMessageCreateDocument);
    const [, resetUnread] = useMutation(ProfileSupportRequestUnreadNotificationCountResetDocument);
    const resetDone = useRef(false);

    useEffect(() => {
        if (user == null) return;
        if (supportRequest == null) {
            void navigate({ to: supportRequestsListRoute.to });
        }
    }, [navigate, supportRequest, user]);

    useEffect(() => {
        if (supportRequest == null) return;
        if (resetDone.current) return;
        if (supportRequest.userUnreadNotificationCount <= 0) return;
        resetDone.current = true;
        void resetUnread({ supportRequestId });
    }, [resetUnread, supportRequest, supportRequestId]);

    if (supportRequest == null) {
        return null;
    }

    const statusLabel =
        supportRequest.status === 'RESOLVED' ? { de: 'Erledigt', en: 'Resolved' }[locale] : { de: 'Offen', en: 'Open' }[locale];

    return (
        <main id="main-content" data-workspace-fill="" className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-serif text-2xl/tight text-foreground">{supportRequest.subject}</h1>
                        <StatusBadge tone={supportRequest.status === 'RESOLVED' ? 'success' : 'warning'}>{statusLabel}</StatusBadge>
                    </div>
                    {supportRequest.bookingRequest ? (
                        <Link
                            to="/{-$locale}/profile/booking-requests/$bookingRequestId"
                            params={{ bookingRequestId: supportRequest.bookingRequest.bookingRequestId }}
                            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                            {supportRequest.bookingRequest.occasion}
                        </Link>
                    ) : (
                        <p className="text-sm text-muted-foreground">{{ de: 'Allgemeine Anfrage', en: 'General request' }[locale]}</p>
                    )}
                </div>
            </div>

            <SupportRequestChat
                className="-mx-4 min-h-0 flex-1 overflow-hidden border-t px-4 pt-4"
                messages={supportRequest.messages}
                canSend
                peerDisplay={{ de: 'peopleeat Support', en: 'peopleeat Support' }[locale]}
                onSend={async (message, fileUploadIds) => {
                    const result = await sendMessage({ supportRequestId, message, fileUploadIds });
                    return Boolean(result.data?.user.supportRequestMessageCreate.success);
                }}
            />
        </main>
    );
}
