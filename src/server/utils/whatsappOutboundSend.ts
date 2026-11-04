import { eq, inArray } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import { textNormalizeSingleLine } from '../../shared/textNormalize';
import type { Database, DatabaseTransaction } from '../db';
import { outboundWhatsAppMessages, users, whatsAppConversations, whatsAppMessages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { OutboundWhatsAppPurpose, OutboundWhatsAppRelatedEntityType } from '../domain/whatsapp';
import { whatsappPhoneNumberNormalize, whatsappPhoneNumberUserMatchValues, whatsappTemplateNameByPurpose } from '../domain/whatsapp';
import { whatsappTemplateDefinitionFind, whatsappTemplateSnapshotCreate, whatsappTemplateSnapshotText } from '../domain/whatsappTemplates';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { WhatsApp } from '../whatsapp/WhatsApp';
import { whatsappLinkPathAssert, whatsappLinkPathFind } from './whatsappLink';

type RelatedEntity = { type: OutboundWhatsAppRelatedEntityType; id: string };

export type WhatsAppTemplateOutboundArgs = {
    purpose: Exclude<OutboundWhatsAppPurpose, 'CONCIERGE_SESSION_REPLY'>;
    toPhoneNumber: string | null | undefined;
    locale: Locale;
    bodyParameters: ReadonlyArray<string>;
    linkPath?: string;
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
    db: Database | DatabaseTransaction,
    args: { phoneNumber: string; userId: string | null; lastMessageAt: Date; displayName?: string | null },
): Promise<string> {
    let userId = args.userId;
    if (!userId) {
        const [matched] = await db
            .select({ userId: users.userId })
            .from(users)
            .where(inArray(users.phoneNumber, whatsappPhoneNumberUserMatchValues(args.phoneNumber)))
            .limit(1);
        userId = matched?.userId ?? null;
    }

    const whatsAppConversationId = idCreate();
    const [row] = await db
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

function whatsappOutboundSkipDetail(args: WhatsAppTemplateOutboundArgs): string {
    const parts = [`purpose=${args.purpose}`];
    if (args.userId) parts.push(`user=${args.userId}`);
    if (args.relatedEntity) parts.push(`related=${args.relatedEntity.type}:${args.relatedEntity.id}`);
    return parts.join(' ');
}

/** Persist the exact catalog rendering sent to Meta, including its effective language and buttons. */
export async function whatsappTemplateOutboundSend(
    serverRuntime: ServerRuntime,
    provider: WhatsApp,
    args: WhatsAppTemplateOutboundArgs,
): Promise<{ outboundWhatsAppMessageId: string } | null> {
    const toPhoneNumber = whatsappPhoneNumberNormalize(args.toPhoneNumber);
    if (!toPhoneNumber) {
        serverRuntime.log.info(
            `whatsappTemplateOutboundSend: skip ${whatsappOutboundSkipDetail(args)} (phone missing or not E.164; raw=${JSON.stringify(args.toPhoneNumber ?? null)})`,
        );
        return null;
    }
    const templateName = whatsappTemplateNameByPurpose[args.purpose];
    if (!templateName) {
        serverRuntime.log.info(`whatsappTemplateOutboundSend: skip ${whatsappOutboundSkipDetail(args)} (email-only; no WhatsApp template)`);
        return null;
    }
    const definition = whatsappTemplateDefinitionFind(templateName);
    const outboundWhatsAppMessageId = idCreate();
    const whatsAppMessageId = idCreate();
    const now = new Date();
    const linkPath = definition[args.locale].buttonLabel
        ? whatsappLinkPathAssert(args.linkPath ?? (await whatsappLinkPathFind(serverRuntime, args)))
        : null;
    const buttonUrl = linkPath
        ? `${environmentVariables.webPageUrl.replace(/\/$/u, '')}/api/whatsapp/links/${outboundWhatsAppMessageId}`
        : undefined;
    const bodyParameters = args.bodyParameters.map(textNormalizeSingleLine);
    const snapshot = whatsappTemplateSnapshotCreate(definition, args.locale, bodyParameters, buttonUrl);
    const body = whatsappTemplateSnapshotText(snapshot);
    const auditInsert = {
        outboundWhatsAppMessageId,
        provider: environmentVariables.whatsappTransport === 'console' ? ('console' as const) : ('meta' as const),
        purpose: args.purpose,
        relatedEntityType: args.relatedEntity?.type ?? null,
        relatedEntityId: args.relatedEntity?.id ?? null,
        userId: args.userId ?? null,
        toPhoneNumber,
        templateName,
        templateSnapshot: snapshot,
        linkPath,
        bodySnapshot: body,
        locale: args.locale,
        createdAt: now,
    };
    await serverRuntime.db.insert(outboundWhatsAppMessages).values(auditInsert);
    let acceptedResult: { providerMessageId: string | null } | undefined;
    try {
        const result = await provider.sendTemplate({
            toPhoneNumber,
            templateName,
            languageCode: args.locale,
            bodyParameters,
            buttonUrlParameter: linkPath ? outboundWhatsAppMessageId : undefined,
        });
        acceptedResult = result;
        await serverRuntime.db.transaction(async (transaction) => {
            const conversationId = await conversationUpsert(transaction, {
                phoneNumber: toPhoneNumber,
                userId: args.userId ?? null,
                lastMessageAt: now,
            });
            await transaction.insert(whatsAppMessages).values({
                whatsAppMessageId,
                whatsAppConversationId: conversationId,
                direction: 'OUTBOUND',
                messageKind: 'TEMPLATE',
                body,
                templateSnapshot: snapshot,
                providerMessageId: result.providerMessageId,
                outboundWhatsAppMessageId,
                createdAt: now,
            });
            await transaction
                .update(outboundWhatsAppMessages)
                .set({ providerMessageId: result.providerMessageId, sentAt: now, whatsAppConversationId: conversationId })
                .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, outboundWhatsAppMessageId));
        });
        try {
            await serverRuntime.publish.adminUpdates();
        } catch (error) {
            serverRuntime.log.error(error, null);
        }
        return { outboundWhatsAppMessageId };
    } catch (error) {
        const failureReason = error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp template send failed';
        await serverRuntime.db
            .update(outboundWhatsAppMessages)
            .set(
                acceptedResult
                    ? {
                          providerMessageId: acceptedResult.providerMessageId,
                          sentAt: now,
                          failureReason: `Provider accepted message; transcript persistence failed: ${failureReason}`,
                      }
                    : { failedAt: new Date(), failureReason },
            )
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, outboundWhatsAppMessageId));
        serverRuntime.log.error(error, null);
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
