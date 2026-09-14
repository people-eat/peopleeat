import { environmentVariables } from '../env/environmentVariablesCreate';

function origin(): string {
    return environmentVariables.webPageUrl.replace(/\/$/, '');
}

export function slackAdminBookingRequestUrl(bookingRequestId: string): string {
    return `${origin()}/admin/booking-requests/${bookingRequestId}`;
}

export function slackAdminBookingRequestOfferUrl(bookingRequestId: string, bookingRequestOfferId: string): string {
    return `${origin()}/admin/booking-requests/${bookingRequestId}/offers/${bookingRequestOfferId}`;
}

export function slackAdminUserUrl(userId: string): string {
    return `${origin()}/admin/users/${userId}`;
}

export function slackAdminSupportRequestUrl(supportRequestId: string): string {
    return `${origin()}/admin/support-requests/${supportRequestId}`;
}

export function slackAdminGiftCardUrl(giftCardId: string): string {
    return `${origin()}/admin/gift-cards/${giftCardId}`;
}

export function slackAdminOutboundEmailsUrl(): string {
    return `${origin()}/admin/outbound-emails`;
}

export function slackAdminWhatsAppChatUrl(whatsAppConversationId: string): string {
    return `${origin()}/admin/whats-app-chats/${whatsAppConversationId}`;
}

export function slackAdminOfferChatReviewUrl(bookingRequestOfferId: string): string {
    return `${origin()}/admin/offer-chat-reviews/${bookingRequestOfferId}`;
}
