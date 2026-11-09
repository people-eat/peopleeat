/** Authors may retract an own offer-chat bubble for this long after send. */
export const BOOKING_REQUEST_OFFER_CHAT_MESSAGE_AUTHOR_DELETE_WINDOW_MS = 60 * 60 * 1000;

/** True while the author still has the 1-hour retract window on `createdAt`. */
export function bookingRequestOfferChatMessageAuthorCanDelete(createdAt: Date, now: Date = new Date()): boolean {
    return now.getTime() - createdAt.getTime() < BOOKING_REQUEST_OFFER_CHAT_MESSAGE_AUTHOR_DELETE_WINDOW_MS;
}
