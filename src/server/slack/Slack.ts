import type { KnownBlock } from '@slack/web-api';

export type SlackChannels = Record<
    | 'bookingRequests'
    | 'cashCows'
    | 'signUps'
    | 'supportRequests'
    | 'giftCardPurchases'
    | 'bookingRequestReports'
    | 'opsAlerts'
    | 'whatsAppMessages',
    string | undefined
>;

export type SlackPostMessageArgs = {
    channel: string;
    text: string;
    blocks: KnownBlock[];
    threadTs?: string;
    broadcast?: boolean;
};

export type Slack = {
    isConfigured: () => boolean;
    channels: SlackChannels;
    postMessage: (args: SlackPostMessageArgs) => Promise<{ ts: string } | undefined>;
};
