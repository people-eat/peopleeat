import { notFound } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { WhatsAppConversationChat } from '../../components/WhatsAppConversationChat';
import type { GqlCAdminWhatsAppChatDetailFieldsFragment, GqlCAdminWhatsAppChatPageQuery } from '../../graphql/generated';
import {
    AdminWhatsAppChatPageUpdatesDocument,
    AdminWhatsAppConversationUnreadCountResetDocument,
    AdminWhatsAppMessageCreateDocument,
    AdminWhatsAppMessageReactionUpsertDocument,
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
    const [, upsertReaction] = useMutation(AdminWhatsAppMessageReactionUpsertDocument);
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
            <AdminPinnedFooterLayout contentScroll={false} contentClassName="flex w-full min-w-0 flex-col pb-0">
                <WhatsAppConversationChat
                    className="min-h-0 min-w-0 flex-1 overflow-hidden"
                    messages={conversation.messages}
                    canSend={windowOpen}
                    peerDisplay={peerDisplay}
                    profilePictureUrl={conversation.customer?.profilePicture?.url ?? null}
                    customerUserId={conversation.customer?.userId ?? null}
                    onSend={async (message) => {
                        const result = await sendMessage({ whatsAppConversationId, message });
                        return Boolean(result.data?.admin.whatsAppMessageCreate.success);
                    }}
                    onReact={async (whatsAppMessageId, emoji) => {
                        const result = await upsertReaction({ whatsAppMessageId, emoji });
                        return Boolean(result.data?.admin.whatsAppMessageReactionUpsert.success);
                    }}
                />
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
