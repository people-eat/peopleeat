import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestSlackThreadReply } from './bookingRequestSlack';
import { bookingRequestSlackSummaryFields, bookingRequestSlackSummaryLoad } from './bookingRequestSlackSummaryLoad';
import { slackAdminWhatsAppChatUrl } from './slackAdminUrls';
import { slackMessageBlocksBuild } from './slackBlocks';
import { SLACK_CTA } from './slackCta';

export type WhatsAppInboundSlackNotifyArgs = {
    whatsAppConversationId: string;
    peerDisplay: string;
    phoneNumber: string;
    messagePreview: string;
};

/** Fail-soft Slack post for a new inbound Concierge WhatsApp message. */
export async function whatsappInboundSlackNotify(serverRuntime: ServerRuntime, args: WhatsAppInboundSlackNotifyArgs): Promise<void> {
    const channelId = serverRuntime.slack.channels.whatsAppMessages;
    if (!channelId) {
        return;
    }

    try {
        const { text, blocks } = slackMessageBlocksBuild({
            header: `WhatsApp-Nachricht von ${args.peerDisplay}`,
            fields: [{ label: 'Telefon', value: args.phoneNumber }],
            body: args.messagePreview,
            adminHref: slackAdminWhatsAppChatUrl(args.whatsAppConversationId),
            adminButtonTitle: SLACK_CTA.chat,
        });
        await serverRuntime.slack.postMessage({ channel: channelId, text, blocks });
    } catch (error) {
        serverRuntime.log.error(error, null);
    }
}

/** Fail-soft booking-thread reply when a customer taps a reaction quick-reply. */
export async function whatsappBookingReactionSlackNotify(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; reactionLabel: string },
): Promise<void> {
    const summary = await bookingRequestSlackSummaryLoad(serverRuntime, { bookingRequestId: args.bookingRequestId });
    const fields = summary ? bookingRequestSlackSummaryFields(summary, { includeCook: false }) : [];
    fields.push({ label: 'Reaktion', value: args.reactionLabel });
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: summary ? `WhatsApp-Reaktion · ${summary.customerName}` : 'WhatsApp-Reaktion',
        fields,
    });
}
