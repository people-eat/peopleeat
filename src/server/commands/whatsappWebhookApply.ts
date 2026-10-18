import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOffers,
    bookingRequests,
    outboundWhatsAppMessages,
    users,
    whatsAppConversations,
    whatsAppMessageAttachments,
    whatsAppMessageReactions,
    whatsAppMessages,
} from '../db/schema';
import type { OutboundWhatsAppMessageCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { WhatsAppMessageKind } from '../domain/whatsapp';
import {
    WHATSAPP_BOOKING_REQUEST_REACTION_LABELS,
    WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS,
    whatsappMimeTypeExtension,
    whatsappPhoneNumberNormalize,
    whatsappPhoneNumberUserMatchValues,
} from '../domain/whatsapp';
import { whatsappBookingReactionSlackNotify, whatsappInboundSlackNotify } from '../slack/whatsappSlack';
import { fileUploadCreate } from './fileUploadCreate';

type MetaStatus = {
    id?: string;
    status?: string;
    timestamp?: string;
    conversation?: { id?: string };
    pricing?: { category?: string };
    errors?: Array<{ message?: string }>;
};

type MetaMediaRef = { id?: string; caption?: string; mime_type?: string; filename?: string };

type MetaInboundMessage = {
    id?: string;
    from?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
    image?: MetaMediaRef;
    video?: MetaMediaRef;
    audio?: MetaMediaRef;
    voice?: MetaMediaRef;
    document?: MetaMediaRef;
    sticker?: MetaMediaRef;
    button?: { text?: string; payload?: string };
    interactive?: {
        type?: string;
        button_reply?: { id?: string; title?: string };
        list_reply?: { id?: string; title?: string };
    };
    reaction?: { message_id?: string; emoji?: string };
};

type MetaContact = {
    profile?: { name?: string };
    wa_id?: string;
};

export type WhatsAppWebhookPayload = {
    object?: string;
    entry?: Array<{
        changes?: Array<{
            value?: {
                statuses?: MetaStatus[];
                messages?: MetaInboundMessage[];
                contacts?: MetaContact[];
            };
        }>;
    }>;
};

/**
 * Apply Meta WhatsApp webhook statuses + inbound messages.
 * Status timestamps are first-write-wins. Inbound messages are idempotent on
 * `providerMessageId`.
 */
export async function whatsappWebhookApply(
    payload: WhatsAppWebhookPayload,
    serverRuntime: ServerRuntime,
): Promise<{ statusesApplied: number; messagesApplied: number }> {
    let statusesApplied = 0;
    let messagesApplied = 0;

    for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
            const value = change.value;
            if (!value) continue;

            for (const status of value.statuses ?? []) {
                if (await statusApply(status, serverRuntime)) {
                    statusesApplied += 1;
                }
            }

            const contactName = value.contacts?.[0]?.profile?.name?.trim() || null;

            for (const message of value.messages ?? []) {
                if (await inboundApply(message, contactName, serverRuntime)) {
                    messagesApplied += 1;
                }
            }
        }
    }

    if (messagesApplied > 0) {
        await serverRuntime.publish.adminUpdates();
    }

    return { statusesApplied, messagesApplied };
}

async function statusApply(status: MetaStatus, serverRuntime: ServerRuntime): Promise<boolean> {
    const providerMessageId = status.id?.trim();
    if (!providerMessageId || !status.status) {
        return false;
    }

    const column = lifecycleColumnForStatus(status.status);
    if (!column) {
        return false;
    }

    const createdAt = status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date();
    const [existing] = await serverRuntime.db
        .select({
            outboundWhatsAppMessageId: outboundWhatsAppMessages.outboundWhatsAppMessageId,
        })
        .from(outboundWhatsAppMessages)
        .where(eq(outboundWhatsAppMessages.providerMessageId, providerMessageId))
        .limit(1);

    if (!existing) {
        return false;
    }

    const setValues: Partial<OutboundWhatsAppMessageCreate> = {};
    if (status.conversation?.id) {
        setValues.providerConversationId = status.conversation.id;
    }
    if (status.pricing?.category) {
        setValues.pricingCategory = status.pricing.category;
    }
    if (column === 'failedAt') {
        setValues.failedAt = createdAt;
        const failureReason = status.errors?.[0]?.message;
        if (failureReason) {
            setValues.failureReason = failureReason.slice(0, 500);
        }
    } else {
        setValues[column] = createdAt;
    }

    const nullGuard =
        column === 'sentAt'
            ? isNull(outboundWhatsAppMessages.sentAt)
            : column === 'deliveredAt'
              ? isNull(outboundWhatsAppMessages.deliveredAt)
              : column === 'readAt'
                ? isNull(outboundWhatsAppMessages.readAt)
                : isNull(outboundWhatsAppMessages.failedAt);

    const updated = await serverRuntime.db
        .update(outboundWhatsAppMessages)
        .set(setValues)
        .where(and(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, existing.outboundWhatsAppMessageId), nullGuard))
        .returning({ outboundWhatsAppMessageId: outboundWhatsAppMessages.outboundWhatsAppMessageId });

    if (updated.length === 0) {
        return false;
    }

    const transcriptSet: Partial<{ deliveredAt: Date; readAt: Date; failedAt: Date }> = {};
    if (column === 'deliveredAt') transcriptSet.deliveredAt = createdAt;
    if (column === 'readAt') transcriptSet.readAt = createdAt;
    if (column === 'failedAt') transcriptSet.failedAt = createdAt;

    if (Object.keys(transcriptSet).length > 0) {
        const transcriptNullGuard =
            column === 'deliveredAt'
                ? isNull(whatsAppMessages.deliveredAt)
                : column === 'readAt'
                  ? isNull(whatsAppMessages.readAt)
                  : isNull(whatsAppMessages.failedAt);
        await serverRuntime.db
            .update(whatsAppMessages)
            .set(transcriptSet)
            .where(and(eq(whatsAppMessages.outboundWhatsAppMessageId, existing.outboundWhatsAppMessageId), transcriptNullGuard));
    }

    return true;
}

function lifecycleColumnForStatus(status: string): 'sentAt' | 'deliveredAt' | 'readAt' | 'failedAt' | null {
    switch (status) {
        case 'sent':
            return 'sentAt';
        case 'delivered':
            return 'deliveredAt';
        case 'read':
            return 'readAt';
        case 'failed':
            return 'failedAt';
        default:
            return null;
    }
}

async function inboundApply(message: MetaInboundMessage, contactName: string | null, serverRuntime: ServerRuntime): Promise<boolean> {
    if (message.type === 'reaction') {
        return inboundReactionApply(message, serverRuntime);
    }

    const providerMessageId = message.id?.trim();
    const fromRaw = message.from?.trim();
    if (!providerMessageId || !fromRaw) {
        return false;
    }

    const [already] = await serverRuntime.db
        .select({ whatsAppMessageId: whatsAppMessages.whatsAppMessageId })
        .from(whatsAppMessages)
        .where(eq(whatsAppMessages.providerMessageId, providerMessageId))
        .limit(1);
    if (already) {
        return false;
    }

    const phoneNumber = whatsappPhoneNumberNormalize(fromRaw.startsWith('+') ? fromRaw : `+${fromRaw}`);
    if (!phoneNumber) {
        serverRuntime.log.info(`whatsappWebhookApply: skipping inbound with non-E.164 from=${fromRaw}`);
        return false;
    }

    const createdAt = message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date();
    const parsed = await inboundContentParse(message, serverRuntime);
    const windowExpiresAt = new Date(createdAt.getTime() + WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS);

    const [matchedUser] = await serverRuntime.db
        .select({ userId: users.userId, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.phoneNumber, whatsappPhoneNumberUserMatchValues(phoneNumber)))
        .limit(1);

    const conversationId = idCreate();
    const [conversation] = await serverRuntime.db
        .insert(whatsAppConversations)
        .values({
            whatsAppConversationId: conversationId,
            phoneNumber,
            displayName: contactName,
            userId: matchedUser?.userId ?? null,
            lastMessageAt: createdAt,
            adminUnreadCount: 1,
            customerServiceWindowExpiresAt: windowExpiresAt,
            createdAt,
        })
        .onConflictDoUpdate({
            target: whatsAppConversations.phoneNumber,
            set: {
                lastMessageAt: createdAt,
                adminUnreadCount: sql`${whatsAppConversations.adminUnreadCount} + 1`,
                customerServiceWindowExpiresAt: windowExpiresAt,
                ...(matchedUser ? { userId: matchedUser.userId } : {}),
                ...(contactName ? { displayName: contactName } : {}),
            },
        })
        .returning({ whatsAppConversationId: whatsAppConversations.whatsAppConversationId });

    if (!conversation) {
        return false;
    }

    const whatsAppMessageId = idCreate();
    await serverRuntime.db.insert(whatsAppMessages).values({
        whatsAppMessageId,
        whatsAppConversationId: conversation.whatsAppConversationId,
        direction: 'INBOUND',
        messageKind: parsed.messageKind,
        body: parsed.body,
        buttonPayload: parsed.buttonPayload,
        providerMessageId,
        outboundWhatsAppMessageId: null,
        sentByAdminUserId: null,
        createdAt,
    });

    for (const [index, fileUploadId] of parsed.fileUploadIds.entries()) {
        await serverRuntime.db.insert(whatsAppMessageAttachments).values({
            whatsAppMessageId,
            fileUploadId,
            position: index,
        });
    }

    const peerDisplay = (matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}`.trim() : undefined) || contactName || phoneNumber;
    const messagePreview = parsed.body || (parsed.fileUploadIds.length > 0 ? `[${parsed.fileUploadIds.length} Medien]` : '[Nachricht]');

    if (parsed.buttonLabel && WHATSAPP_BOOKING_REQUEST_REACTION_LABELS.has(parsed.buttonLabel) && matchedUser) {
        const bookingRequestId = await mostRecentOpenBookingRequestWithOffersFind(serverRuntime, matchedUser.userId);
        if (bookingRequestId) {
            await whatsappBookingReactionSlackNotify(serverRuntime, {
                bookingRequestId,
                reactionLabel: parsed.buttonLabel,
            });
        } else {
            await whatsappInboundSlackNotify(serverRuntime, {
                whatsAppConversationId: conversation.whatsAppConversationId,
                peerDisplay,
                phoneNumber,
                messagePreview,
            });
        }
    } else {
        await whatsappInboundSlackNotify(serverRuntime, {
            whatsAppConversationId: conversation.whatsAppConversationId,
            peerDisplay,
            phoneNumber,
            messagePreview,
        });
    }

    return true;
}

/**
 * Meta `type: reaction` — apply/clear an emoji on the target transcript message.
 * Not a transcript row; does not Slack-notify (unread badge + live update only).
 */
async function inboundReactionApply(message: MetaInboundMessage, serverRuntime: ServerRuntime): Promise<boolean> {
    const providerMessageId = message.id?.trim();
    const targetProviderMessageId = message.reaction?.message_id?.trim();
    const fromRaw = message.from?.trim();
    if (!providerMessageId || !targetProviderMessageId || !fromRaw) {
        return false;
    }

    const [already] = await serverRuntime.db
        .select({ whatsAppMessageReactionId: whatsAppMessageReactions.whatsAppMessageReactionId })
        .from(whatsAppMessageReactions)
        .where(eq(whatsAppMessageReactions.providerMessageId, providerMessageId))
        .limit(1);
    if (already) {
        return false;
    }

    const [target] = await serverRuntime.db
        .select({
            whatsAppMessageId: whatsAppMessages.whatsAppMessageId,
            whatsAppConversationId: whatsAppMessages.whatsAppConversationId,
        })
        .from(whatsAppMessages)
        .where(eq(whatsAppMessages.providerMessageId, targetProviderMessageId))
        .limit(1);
    if (!target) {
        serverRuntime.log.info(`whatsappWebhookApply: skipping reaction; target providerMessageId=${targetProviderMessageId} not found`);
        return false;
    }

    if (!whatsappPhoneNumberNormalize(fromRaw.startsWith('+') ? fromRaw : `+${fromRaw}`)) {
        serverRuntime.log.info(`whatsappWebhookApply: skipping reaction with non-E.164 from=${fromRaw}`);
        return false;
    }

    const createdAt = message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date();
    const emoji = message.reaction?.emoji?.trim() || null;
    const windowExpiresAt = new Date(createdAt.getTime() + WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS);

    await serverRuntime.db
        .insert(whatsAppMessageReactions)
        .values({
            whatsAppMessageReactionId: idCreate(),
            whatsAppMessageId: target.whatsAppMessageId,
            direction: 'INBOUND',
            emoji,
            providerMessageId,
            createdAt,
        })
        .onConflictDoUpdate({
            target: [whatsAppMessageReactions.whatsAppMessageId, whatsAppMessageReactions.direction],
            set: {
                emoji,
                providerMessageId,
                createdAt,
            },
        });

    await serverRuntime.db
        .update(whatsAppConversations)
        .set({
            lastMessageAt: createdAt,
            adminUnreadCount: sql`${whatsAppConversations.adminUnreadCount} + 1`,
            customerServiceWindowExpiresAt: windowExpiresAt,
        })
        .where(eq(whatsAppConversations.whatsAppConversationId, target.whatsAppConversationId));

    return true;
}

async function inboundContentParse(
    message: MetaInboundMessage,
    serverRuntime: ServerRuntime,
): Promise<{
    messageKind: WhatsAppMessageKind;
    body: string;
    buttonPayload: string | null;
    buttonLabel: string | null;
    fileUploadIds: string[];
}> {
    const buttonLabel =
        (message.type === 'button' && message.button?.text?.trim()) ||
        (message.type === 'interactive' &&
            message.interactive?.type === 'button_reply' &&
            message.interactive.button_reply?.title?.trim()) ||
        null;
    const buttonPayload =
        (message.type === 'button' && message.button?.payload?.trim()) ||
        (message.type === 'interactive' && message.interactive?.button_reply?.id?.trim()) ||
        null;

    if (buttonLabel) {
        return {
            messageKind: message.type === 'button' ? 'BUTTON_REPLY' : 'INTERACTIVE',
            body: buttonLabel,
            buttonPayload,
            buttonLabel,
            fileUploadIds: [],
        };
    }

    if (message.type === 'text' && message.text?.body?.trim()) {
        return {
            messageKind: 'TEXT',
            body: message.text.body.trim(),
            buttonPayload: null,
            buttonLabel: null,
            fileUploadIds: [],
        };
    }

    const mediaRef =
        (message.type === 'image' && message.image) ||
        (message.type === 'video' && message.video) ||
        (message.type === 'audio' && message.audio) ||
        (message.type === 'voice' && message.voice) ||
        (message.type === 'document' && message.document) ||
        (message.type === 'sticker' && message.sticker) ||
        null;

    if (mediaRef?.id) {
        const downloaded = await serverRuntime.whatsapp.downloadMedia(mediaRef.id);
        const caption = mediaRef.caption?.trim() || '';
        if (!downloaded) {
            return {
                messageKind: 'MEDIA',
                body: caption || '[Medien konnten nicht geladen werden]',
                buttonPayload: null,
                buttonLabel: null,
                fileUploadIds: [],
            };
        }
        const extension = whatsappMimeTypeExtension(downloaded.mimeType);
        const filename = (message.type === 'document' && mediaRef.filename?.trim()) || `whatsapp-media.${extension}`;
        const upload = await fileUploadCreate(serverRuntime.db, {
            userId: null,
            filename,
            mediaType: downloaded.mimeType,
            bytes: downloaded.buffer,
        });
        return {
            messageKind: 'MEDIA',
            body: caption,
            buttonPayload: null,
            buttonLabel: null,
            fileUploadIds: [upload.fileUploadId],
        };
    }

    return {
        messageKind: 'UNSUPPORTED',
        body: '[Unsupported message content]',
        buttonPayload: null,
        buttonLabel: null,
        fileUploadIds: [],
    };
}

async function mostRecentOpenBookingRequestWithOffersFind(serverRuntime: ServerRuntime, userId: string): Promise<string | undefined> {
    const openRequests = await serverRuntime.db
        .select({ bookingRequestId: bookingRequests.bookingRequestId })
        .from(bookingRequests)
        .where(and(eq(bookingRequests.userId, userId), isNull(bookingRequests.canceledAt)))
        .orderBy(desc(bookingRequests.createdAt));

    for (const request of openRequests) {
        const [offer] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, request.bookingRequestId))
            .limit(1);
        if (offer) {
            return request.bookingRequestId;
        }
    }
    return undefined;
}
