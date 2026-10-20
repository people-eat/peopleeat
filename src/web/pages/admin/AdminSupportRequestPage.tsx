import { Link, notFound } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { StatusBadge } from '../../components/base/status-badge';
import { SupportRequestChat } from '../../components/SupportRequestChat';
import type { GqlCAdminSupportRequestDetailFieldsFragment, GqlCAdminSupportRequestPageQuery } from '../../graphql/generated';
import {
    AdminSupportRequestMessageCreateDocument,
    AdminSupportRequestPageUpdatesDocument,
    AdminSupportRequestResolveDocument,
    AdminSupportRequestUnreadNotificationCountResetDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { adminSupportRequestsPageTitle } from './AdminSupportRequestsPage';

export const adminSupportRequestPageTitle = {
    de: 'Support-Anfrage',
    en: 'Support request',
} as const;
export const adminSupportRequestPageDescription = {
    de: 'Support-Chat bearbeiten.',
    en: 'Handle support chat.',
} as const;

export function adminSupportRequestPageVariables(supportRequestId: string) {
    return { supportRequestId };
}

export function AdminSupportRequestPage({ data, supportRequestId }: { data: GqlCAdminSupportRequestPageQuery; supportRequestId: string }) {
    const locale = useLocale();
    const client = useClient();
    const seedRequest = data.currentSession.user?.admin?.supportRequest ?? null;
    if (!seedRequest) throw notFound();

    const [supportRequest, setSupportRequest] = useState<GqlCAdminSupportRequestDetailFieldsFragment>(seedRequest);
    const [, sendMessage] = useMutation(AdminSupportRequestMessageCreateDocument);
    const [, resetUnread] = useMutation(AdminSupportRequestUnreadNotificationCountResetDocument);
    const [, resolveRequest] = useMutation(AdminSupportRequestResolveDocument);
    const [resolveBusy, setResolveBusy] = useState(false);
    const resetDone = useRef(false);

    useEffect(() => {
        setSupportRequest(seedRequest);
    }, [seedRequest]);

    useEffect(() => {
        const request = createRequest(AdminSupportRequestPageUpdatesDocument, { supportRequestId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.supportRequest;
                if (next) setSupportRequest(next);
            }),
        );
        return unsubscribe;
    }, [client, supportRequestId, seedRequest]);

    useEffect(() => {
        if (resetDone.current) return;
        if (supportRequest.adminUnreadNotificationCount <= 0) return;
        resetDone.current = true;
        void resetUnread({ supportRequestId });
    }, [resetUnread, supportRequest.adminUnreadNotificationCount, supportRequestId]);

    const statusLabel =
        supportRequest.status === 'RESOLVED' ? { de: 'Erledigt', en: 'Resolved' }[locale] : { de: 'Offen', en: 'Open' }[locale];

    return (
        <AdminPageChrome
            crumbs={[
                { label: adminSupportRequestsPageTitle[locale], to: '/{-$locale}/admin/support-requests' },
                { label: supportRequest.subject },
            ]}
            contentClassName="min-h-0 overflow-hidden gap-0 pb-0"
        >
            <main id="main-content" data-workspace-fill="" className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden">
                <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-serif text-2xl/tight text-foreground">{supportRequest.subject}</h1>
                            <StatusBadge tone={supportRequest.status === 'RESOLVED' ? 'success' : 'warning'}>{statusLabel}</StatusBadge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: supportRequest.customer.userId }}
                                className="underline-offset-4 hover:underline"
                            >
                                {userDisplayName(supportRequest.customer)}
                            </Link>
                            {supportRequest.bookingRequest ? (
                                <Link
                                    to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                                    params={{ bookingRequestId: supportRequest.bookingRequest.bookingRequestId }}
                                    className="underline-offset-4 hover:underline"
                                >
                                    {supportRequest.bookingRequest.occasion}
                                </Link>
                            ) : (
                                <span>{{ de: 'Allgemeine Anfrage', en: 'General request' }[locale]}</span>
                            )}
                        </div>
                    </div>
                    {supportRequest.status !== 'RESOLVED' ? (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={resolveBusy}
                            onClick={async () => {
                                setResolveBusy(true);
                                try {
                                    await resolveRequest({ supportRequestId });
                                } finally {
                                    setResolveBusy(false);
                                }
                            }}
                        >
                            {{ de: 'Als erledigt markieren', en: 'Mark resolved' }[locale]}
                        </Button>
                    ) : null}
                </div>

                <SupportRequestChat
                    className="min-h-0 flex-1 overflow-hidden border-t pt-4"
                    messages={supportRequest.messages}
                    canSend
                    resolved={supportRequest.status === 'RESOLVED'}
                    peerDisplay={userDisplayName(supportRequest.customer)}
                    onSend={async (message, fileUploadIds) => {
                        const result = await sendMessage({ supportRequestId, message, fileUploadIds });
                        return Boolean(result.data?.admin.supportRequestMessageCreate.success);
                    }}
                />
            </main>
        </AdminPageChrome>
    );
}
