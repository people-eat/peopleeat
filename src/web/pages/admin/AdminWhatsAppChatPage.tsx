import { Link, notFound } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { WhatsAppConversationChat } from '../../components/WhatsAppConversationChat';
import type { GqlCAdminWhatsAppChatDetailFieldsFragment, GqlCAdminWhatsAppChatPageQuery } from '../../graphql/generated';
import {
    AdminWhatsAppChatPageUpdatesDocument,
    AdminWhatsAppConversationUnreadCountResetDocument,
    AdminWhatsAppMessageCreateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { adminWhatsAppChatsPageTitle } from './AdminWhatsAppChatsPage';

export const adminWhatsAppChatPageTitle = {
    de: 'WhatsApp-Chat',
    en: 'WhatsApp chat',
} as const;
export const adminWhatsAppChatPageDescription = {
    de: 'Concierge-WhatsApp bearbeiten.',
    en: 'Handle concierge WhatsApp.',
} as const;

export function adminWhatsAppChatPageVariables(whatsAppConversationId: string) {
    return { whatsAppConversationId };
}

export function AdminWhatsAppChatPage({
    data,
    whatsAppConversationId,
}: {
    data: GqlCAdminWhatsAppChatPageQuery;
    whatsAppConversationId: string;
}) {
    const locale = useLocale();
    const client = useClient();
    const seedConversation = data.currentSession.user?.admin?.whatsAppConversation ?? null;
    if (!seedConversation) throw notFound();

    const [conversation, setConversation] = useState<GqlCAdminWhatsAppChatDetailFieldsFragment>(seedConversation);
    const [, sendMessage] = useMutation(AdminWhatsAppMessageCreateDocument);
    const [, resetUnread] = useMutation(AdminWhatsAppConversationUnreadCountResetDocument);
    const resetDone = useRef(false);

    useEffect(() => {
        setConversation(seedConversation);
    }, [seedConversation]);

    useEffect(() => {
        const request = createRequest(AdminWhatsAppChatPageUpdatesDocument, { whatsAppConversationId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.whatsAppConversation;
                if (next) setConversation(next);
            }),
        );
        return unsubscribe;
    }, [client, whatsAppConversationId, seedConversation]);

    useEffect(() => {
        if (resetDone.current) return;
        if (conversation.adminUnreadCount <= 0) return;
        resetDone.current = true;
        void resetUnread({ whatsAppConversationId });
    }, [resetUnread, conversation.adminUnreadCount, whatsAppConversationId]);

    const windowOpen =
        conversation.customerServiceWindowExpiresAt != null && new Date(conversation.customerServiceWindowExpiresAt).getTime() > Date.now();

    const peerDisplay = conversation.customer
        ? userDisplayName(conversation.customer)
        : conversation.displayName?.trim() || conversation.phoneNumber;

    return (
        <AdminPageChrome
            crumbs={[{ label: adminWhatsAppChatsPageTitle[locale], to: '/{-$locale}/admin/whats-app-chats' }, { label: peerDisplay }]}
            contentClassName="min-h-0 overflow-hidden gap-0 pb-0"
        >
            <main id="main-content" data-workspace-fill="" className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden">
                <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                        <h1 className="font-serif text-2xl/tight text-foreground">{peerDisplay}</h1>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span>{conversation.phoneNumber}</span>
                            {conversation.customer ? (
                                <Link
                                    to="/{-$locale}/admin/users/$userId"
                                    params={{ userId: conversation.customer.userId }}
                                    className="underline-offset-4 hover:underline"
                                >
                                    {{ de: 'Nutzer öffnen', en: 'Open user' }[locale]}
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </div>

                <WhatsAppConversationChat
                    className="min-h-0 flex-1 overflow-hidden border-t pt-4"
                    messages={conversation.messages}
                    canSend={windowOpen}
                    peerDisplay={peerDisplay}
                    onSend={async (message) => {
                        const result = await sendMessage({ whatsAppConversationId, message });
                        return Boolean(result.data?.admin.whatsAppMessageCreate.success);
                    }}
                />
            </main>
        </AdminPageChrome>
    );
}
