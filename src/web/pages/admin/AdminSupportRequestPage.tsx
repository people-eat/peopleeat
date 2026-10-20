import { Link, notFound } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Button } from '../../components/base/button';
import { StatusBadge } from '../../components/base/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
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
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
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

    const peerDisplay = userDisplayName(supportRequest.customer);
    const statusLabel =
        supportRequest.status === 'RESOLVED' ? { de: 'Erledigt', en: 'Resolved' }[locale] : { de: 'Offen', en: 'Open' }[locale];
    const markResolvedLabel = { de: 'Als erledigt markieren', en: 'Mark resolved' }[locale];

    async function onResolveConfirm() {
        setResolveBusy(true);
        try {
            await resolveRequest({ supportRequestId });
            setResolveDialogOpen(false);
        } finally {
            setResolveBusy(false);
        }
    }

    return (
        <AdminPageChrome
            crumbs={[
                { label: adminSupportRequestsPageTitle[locale], to: '/{-$locale}/admin/support-requests' },
                { label: supportRequest.subject },
            ]}
            contentClassName="min-h-0 overflow-hidden gap-0 pb-0"
        >
            <AdminPinnedFooterLayout contentScroll={false} contentClassName="flex w-full min-w-0 flex-col pb-0">
                <SupportRequestChat
                    className="min-h-0 min-w-0 flex-1 overflow-hidden"
                    messages={supportRequest.messages}
                    canSend
                    peerDisplay={peerDisplay}
                    profilePictureUrl={supportRequest.customer.profilePicture?.url ?? null}
                    customerUserId={supportRequest.customer.userId}
                    subtitle={null}
                    context={
                        <>
                            <span className="text-sm font-semibold text-foreground">{peerDisplay}</span>
                            <StatusBadge tone={supportRequest.status === 'RESOLVED' ? 'success' : 'warning'}>{statusLabel}</StatusBadge>
                            {supportRequest.bookingRequest ? null : (
                                <span className="text-sm text-muted-foreground">
                                    {{ de: 'Allgemeine Anfrage', en: 'General request' }[locale]}
                                </span>
                            )}
                        </>
                    }
                    trailing={
                        <>
                            {supportRequest.bookingRequest ? (
                                <Button type="button" variant="outline" size="sm" className="max-w-40 sm:max-w-56" asChild>
                                    <Link
                                        to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                                        params={{ bookingRequestId: supportRequest.bookingRequest.bookingRequestId }}
                                    >
                                        <span className="truncate">{supportRequest.bookingRequest.occasion}</span>
                                    </Link>
                                </Button>
                            ) : null}
                            {supportRequest.status !== 'RESOLVED' ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="max-md:size-8 max-md:gap-0 max-md:px-0"
                                            disabled={resolveBusy}
                                            aria-label={markResolvedLabel}
                                            onClick={() => setResolveDialogOpen(true)}
                                        >
                                            <CheckIcon data-icon="inline-start" aria-hidden />
                                            <span className="max-md:sr-only">{markResolvedLabel}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="md:hidden">{markResolvedLabel}</TooltipContent>
                                </Tooltip>
                            ) : null}
                        </>
                    }
                    onSend={async (message, fileUploadIds) => {
                        const result = await sendMessage({ supportRequestId, message, fileUploadIds });
                        return Boolean(result.data?.admin.supportRequestMessageCreate.success);
                    }}
                />
            </AdminPinnedFooterLayout>

            <AlertDialog
                open={resolveDialogOpen}
                onOpenChange={(open) => {
                    if (resolveBusy) return;
                    setResolveDialogOpen(open);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {{ de: 'Anfrage als erledigt markieren?', en: 'Mark this request as resolved?' }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Die Anfrage verschwindet aus dem offenen Posteingang und der Kunde erhält eine Abschluss-E-Mail. Eine neue Nachricht vom Kunden öffnet sie wieder.',
                                    en: 'The request leaves the open inbox and the customer gets a closed-case email. A new message from the customer reopens it.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={resolveBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={resolveBusy}
                            onClick={(event) => {
                                event.preventDefault();
                                void onResolveConfirm();
                            }}
                        >
                            {resolveBusy
                                ? { de: 'Wird erledigt…', en: 'Resolving…' }[locale]
                                : { de: 'Als erledigt markieren', en: 'Mark resolved' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPageChrome>
    );
}
