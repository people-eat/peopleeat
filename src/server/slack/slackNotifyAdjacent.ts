import type { KnownBlock } from '@slack/web-api';

import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackAdminGiftCardUrl, slackAdminUserUrl } from './slackAdminUrls';
import { slackMessageBlocksBuild } from './slackBlocks';
import type { SlackField } from './slackBlocks';
import { slackFormatCents, slackShortId } from './slackFormat';
import { supportRequestSlackRootPost, supportRequestSlackThreadReply } from './supportRequestSlack';

async function postToChannel(
    serverRuntime: ServerRuntime,
    channelId: string | undefined,
    built: { text: string; blocks: KnownBlock[] },
): Promise<void> {
    if (!channelId) {
        return;
    }
    try {
        await serverRuntime.slack.postMessage({
            channel: channelId,
            text: built.text,
            blocks: built.blocks,
        });
    } catch (error) {
        serverRuntime.log.error(error);
    }
}

export async function slackNotifyCustomerSignUp(
    serverRuntime: ServerRuntime,
    args: {
        userId: string;
        firstName: string;
        lastName: string;
        emailAddress: string;
        phoneNumber: string | null;
    },
): Promise<void> {
    const name = `${args.firstName} ${args.lastName}`;
    await postToChannel(
        serverRuntime,
        serverRuntime.slack.channels.signUps,
        slackMessageBlocksBuild({
            header: `Neue Kundenregistrierung · ${name}`,
            fields: [
                { label: 'Name', value: name },
                { label: 'E-Mail', value: args.emailAddress },
                { label: 'Telefon', value: args.phoneNumber ?? 'nicht hinterlegt' },
            ],
            contextLines: [`User ${slackShortId(args.userId)}`],
            adminHref: slackAdminUserUrl(args.userId),
        }),
    );
}

export async function slackNotifyCookSignUp(
    serverRuntime: ServerRuntime,
    args: {
        userId: string;
        firstName: string;
        lastName: string;
        emailAddress: string;
        phoneNumber: string | null;
        city?: string;
    },
): Promise<void> {
    const name = `${args.firstName} ${args.lastName}`;
    const fields: SlackField[] = [
        { label: 'Name', value: name },
        { label: 'E-Mail', value: args.emailAddress },
        { label: 'Telefon', value: args.phoneNumber ?? 'nicht hinterlegt' },
    ];
    if (args.city) {
        fields.push({ label: 'Stadt', value: args.city });
    }
    await postToChannel(
        serverRuntime,
        serverRuntime.slack.channels.signUps,
        slackMessageBlocksBuild({
            header: `Neuer Koch · ${name}`,
            fields,
            body: 'Profil muss noch freigeschaltet werden.',
            contextLines: [`User ${slackShortId(args.userId)}`],
            adminHref: slackAdminUserUrl(args.userId),
        }),
    );
}

export async function slackNotifySupportRequestCreate(
    serverRuntime: ServerRuntime,
    args: {
        supportRequestId: string;
        userId: string;
        customerName: string;
        subject: string;
        bodyPreview: string;
    },
): Promise<void> {
    await supportRequestSlackRootPost(serverRuntime, args);
}

export async function slackNotifySupportRequestMessage(
    serverRuntime: ServerRuntime,
    args: {
        supportRequestId: string;
        customerName: string;
        bodyPreview: string;
        from: 'customer' | 'admin';
    },
): Promise<void> {
    const header = args.from === 'admin' ? `Support-Antwort · ${args.customerName}` : `Support-Nachricht · ${args.customerName}`;
    await supportRequestSlackThreadReply(serverRuntime, {
        supportRequestId: args.supportRequestId,
        header,
        fields: [{ label: 'Kunde', value: args.customerName }],
        body: args.bodyPreview,
    });
}

export async function slackNotifySupportRequestResolved(
    serverRuntime: ServerRuntime,
    args: {
        supportRequestId: string;
        customerName: string;
        subject: string;
    },
): Promise<void> {
    await supportRequestSlackThreadReply(serverRuntime, {
        supportRequestId: args.supportRequestId,
        header: `Support-Anfrage gelöst · ${args.customerName}`,
        fields: [
            { label: 'Kunde', value: args.customerName },
            { label: 'Betreff', value: args.subject },
        ],
        broadcast: true,
    });
}

export async function slackNotifyGiftCardPaid(
    serverRuntime: ServerRuntime,
    args: {
        giftCardId: string;
        amountCents: number;
        buyerEmail?: string | null;
        recipientEmail?: string | null;
    },
): Promise<void> {
    const fields: SlackField[] = [{ label: 'Betrag', value: slackFormatCents(args.amountCents) }];
    if (args.buyerEmail) {
        fields.push({ label: 'Käufer', value: args.buyerEmail });
    }
    if (args.recipientEmail) {
        fields.push({ label: 'Empfänger', value: args.recipientEmail });
    }
    await postToChannel(
        serverRuntime,
        serverRuntime.slack.channels.giftCardPurchases,
        slackMessageBlocksBuild({
            header: 'Gutschein bezahlt',
            fields,
            contextLines: [`Gift card ${slackShortId(args.giftCardId)}`],
            adminHref: slackAdminGiftCardUrl(args.giftCardId),
        }),
    );
}
