import { eq, inArray } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import { outboundWhatsAppMessages, users, whatsAppConversations, whatsAppMessages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { OutboundWhatsAppPurpose, OutboundWhatsAppRelatedEntityType } from '../domain/whatsapp';
import {
    whatsappPhoneNumberNormalize,
    whatsappPhoneNumberUserMatchValues,
    whatsappTemplateLanguageCode,
    whatsappTemplateNameByPurpose,
} from '../domain/whatsapp';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { WhatsApp } from '../whatsapp/WhatsApp';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';

type RelatedEntity = { type: OutboundWhatsAppRelatedEntityType; id: string };

export type WhatsAppTemplateOutboundArgs = {
    purpose: Exclude<OutboundWhatsAppPurpose, 'CONCIERGE_SESSION_REPLY'>;
    toPhoneNumber: string | null | undefined;
    locale: Locale;
    bodyParameters: ReadonlyArray<string>;
    bodySnapshot: string;
    buttonUrlParameter?: string;
    headerParameters?: ReadonlyArray<string>;
    userId?: string | null;
    relatedEntity?: RelatedEntity;
};

export type WhatsAppTextOutboundArgs = {
    purpose: 'CONCIERGE_SESSION_REPLY';
    toPhoneNumber: string;
    locale: Locale;
    body: string;
    userId?: string | null;
    sentByAdminUserId: string;
    whatsAppConversationId: string;
};

async function conversationUpsert(
    serverRuntime: ServerRuntime,
    args: { phoneNumber: string; userId: string | null; lastMessageAt: Date; displayName?: string | null },
): Promise<string> {
    let userId = args.userId;
    if (!userId) {
        const [matched] = await serverRuntime.db
            .select({ userId: users.userId })
            .from(users)
            .where(inArray(users.phoneNumber, whatsappPhoneNumberUserMatchValues(args.phoneNumber)))
            .limit(1);
        userId = matched?.userId ?? null;
    }

    const whatsAppConversationId = idCreate();
    const [row] = await serverRuntime.db
        .insert(whatsAppConversations)
        .values({
            whatsAppConversationId,
            phoneNumber: args.phoneNumber,
            displayName: args.displayName ?? null,
            userId,
            lastMessageAt: args.lastMessageAt,
            adminUnreadCount: 0,
            createdAt: args.lastMessageAt,
        })
        .onConflictDoUpdate({
            target: whatsAppConversations.phoneNumber,
            set: {
                lastMessageAt: args.lastMessageAt,
                ...(userId ? { userId } : {}),
                ...(args.displayName ? { displayName: args.displayName } : {}),
            },
        })
        .returning({ whatsAppConversationId: whatsAppConversations.whatsAppConversationId });

    if (!row) {
        throw new Error('whatsappOutboundSend: conversation upsert returned no rows');
    }
    return row.whatsAppConversationId;
}

/**
 * Send a utility template, persist the audit row, and append an outbound transcript line.
 * Returns null when the phone is missing/invalid (caller should treat as skip).
 */
export async function whatsappTemplateOutboundSend(
    serverRuntime: ServerRuntime,
    provider: WhatsApp,
    args: WhatsAppTemplateOutboundArgs,
): Promise<{ outboundWhatsAppMessageId: string } | null> {
    const toPhoneNumber = whatsappPhoneNumberNormalize(args.toPhoneNumber);
    if (!toPhoneNumber) {
        serverRuntime.log.info(`whatsappTemplateOutboundSend: skip purpose=${args.purpose} (missing or invalid E.164 phone)`);
        return null;
    }

    const templateName = whatsappTemplateNameByPurpose[args.purpose];
    if (!templateName) {
        serverRuntime.log.info(`whatsappTemplateOutboundSend: skip purpose=${args.purpose} (no approved Meta template name)`);
        return null;
    }

    const outboundWhatsAppMessageId = idCreate();
    const now = new Date();
    const providerName = environmentVariables.whatsappTransport === 'console' ? 'console' : 'meta';
    let languageCode = whatsappTemplateLanguageCode(args.locale);
    if (languageCode === 'en' && !(await featureToggleIsEnabled('WHATSAPP_ENGLISH_TEMPLATES', serverRuntime, args.userId))) {
        languageCode = 'de';
    }

    await serverRuntime.db.insert(outboundWhatsAppMessages).values({
        outboundWhatsAppMessageId,
        provider: providerName,
        purpose: args.purpose,
        relatedEntityType: args.relatedEntity?.type ?? null,
        relatedEntityId: args.relatedEntity?.id ?? null,
        userId: args.userId ?? null,
        toPhoneNumber,
        templateName,
        bodySnapshot: args.bodySnapshot,
        locale: args.locale,
        createdAt: now,
    });

    try {
        const result = await provider.sendTemplate({
            toPhoneNumber,
            templateName,
            languageCode,
            bodyParameters: args.bodyParameters,
            buttonUrlParameter: args.buttonUrlParameter,
            headerParameters: args.headerParameters,
        });
        const conversationId = await conversationUpsert(serverRuntime, {
            phoneNumber: toPhoneNumber,
            userId: args.userId ?? null,
            lastMessageAt: now,
        });
        const whatsAppMessageId = idCreate();
        await serverRuntime.db.insert(whatsAppMessages).values({
            whatsAppMessageId,
            whatsAppConversationId: conversationId,
            direction: 'OUTBOUND',
            messageKind: 'TEMPLATE',
            body: args.bodySnapshot,
            providerMessageId: result.providerMessageId,
            outboundWhatsAppMessageId,
            sentByAdminUserId: null,
            createdAt: now,
        });
        await serverRuntime.db
            .update(outboundWhatsAppMessages)
            .set({
                providerMessageId: result.providerMessageId,
                sentAt: now,
                whatsAppConversationId: conversationId,
            })
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, outboundWhatsAppMessageId));
        serverRuntime.log.info(
            `whatsappTemplateOutboundSend: sent purpose=${args.purpose} template=${templateName} lang=${languageCode} to=${toPhoneNumber} providerMessageId=${result.providerMessageId ?? 'null'}`,
        );
        return { outboundWhatsAppMessageId };
    } catch (error) {
        const failureReason = error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp template send failed';
        await serverRuntime.db
            .update(outboundWhatsAppMessages)
            .set({ failedAt: new Date(), failureReason })
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, outboundWhatsAppMessageId));
        serverRuntime.log.error(
            error instanceof Error
                ? new Error(
                      `whatsappTemplateOutboundSend: failed purpose=${args.purpose} template=${templateName} to=${toPhoneNumber}: ${failureReason}`,
                      { cause: error },
                  )
                : error,
            null,
        );
        throw error;
    }
}

/** Send a free-form session reply into an existing conversation. */
export async function whatsappTextOutboundSend(
    serverRuntime: ServerRuntime,
    provider: WhatsApp,
    args: WhatsAppTextOutboundArgs,
): Promise<{ outboundWhatsAppMessageId: string; whatsAppMessageId: string }> {
    const toPhoneNumber = whatsappPhoneNumberNormalize(args.toPhoneNumber);
    if (!toPhoneNumber) {
        throw new Error('whatsappTextOutboundSend: phone number must be E.164');
    }

    const outboundWhatsAppMessageId = idCreate();
    const now = new Date();
    const providerName = environmentVariables.whatsappTransport === 'console' ? 'console' : 'meta';

    await serverRuntime.db.insert(outboundWhatsAppMessages).values({
        outboundWhatsAppMessageId,
        provider: providerName,
        purpose: args.purpose,
        relatedEntityType: 'WHATSAPP_CONVERSATION',
        relatedEntityId: args.whatsAppConversationId,
        userId: args.userId ?? null,
        toPhoneNumber,
        templateName: null,
        bodySnapshot: args.body,
        locale: args.locale,
        whatsAppConversationId: args.whatsAppConversationId,
        createdAt: now,
    });

    try {
        const result = await provider.sendText({ toPhoneNumber, body: args.body });
        const whatsAppMessageId = idCreate();
        await serverRuntime.db.insert(whatsAppMessages).values({
            whatsAppMessageId,
            whatsAppConversationId: args.whatsAppConversationId,
            direction: 'OUTBOUND',
            messageKind: 'TEXT',
            body: args.body,
            providerMessageId: result.providerMessageId,
            outboundWhatsAppMessageId,
            sentByAdminUserId: args.sentByAdminUserId,
            createdAt: now,
        });
        await serverRuntime.db
            .update(whatsAppConversations)
            .set({ lastMessageAt: now })
            .where(eq(whatsAppConversations.whatsAppConversationId, args.whatsAppConversationId));
        await serverRuntime.db
            .update(outboundWhatsAppMessages)
            .set({
                providerMessageId: result.providerMessageId,
                sentAt: now,
            })
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, outboundWhatsAppMessageId));
        return { outboundWhatsAppMessageId, whatsAppMessageId };
    } catch (error) {
        const failureReason = error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp text send failed';
        await serverRuntime.db
            .update(outboundWhatsAppMessages)
            .set({ failedAt: new Date(), failureReason })
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, outboundWhatsAppMessageId));
        throw error;
    }
}
