import type { SlackChannels } from './Slack';

export type SlackChannelsCreateOptions = {
    bookingRequests: string | undefined;
    cashCows: string | undefined;
    signUps: string | undefined;
    supportRequests: string | undefined;
    giftCardPurchases: string | undefined;
    bookingRequestReports: string | undefined;
    opsAlerts: string | undefined;
    whatsAppMessages: string | undefined;
};

export function slackChannelsCreate(options: SlackChannelsCreateOptions): SlackChannels {
    return {
        bookingRequests: options.bookingRequests?.trim() || undefined,
        cashCows: options.cashCows?.trim() || undefined,
        signUps: options.signUps?.trim() || undefined,
        supportRequests: options.supportRequests?.trim() || undefined,
        giftCardPurchases: options.giftCardPurchases?.trim() || undefined,
        bookingRequestReports: options.bookingRequestReports?.trim() || undefined,
        opsAlerts: options.opsAlerts?.trim() || undefined,
        whatsAppMessages: options.whatsAppMessages?.trim() || undefined,
    };
}
