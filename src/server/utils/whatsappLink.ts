import { eq, sql } from 'drizzle-orm';
import { isbot } from 'isbot';

import { zNanoId } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, outboundWhatsAppMessages, whatsAppMessages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { OutboundWhatsAppPurpose, OutboundWhatsAppRelatedEntityType } from '../domain/whatsapp';

const idPattern = '[A-Za-z0-9_-]{20}';
const destinationPattern = new RegExp(
    `^/(?:en/)?profile/(?:booking-requests/${idPattern}(?:/offers/${idPattern})?|booking-request-offers/${idPattern}|booking-request-pool/${idPattern})(?:\\?tab=(?:offer|chat|call|testimonial|request))?$`,
    'u',
);

export function whatsappLinkPathAssert(path: string): string {
    if (!destinationPattern.test(path)) throw new Error('Invalid WhatsApp link destination');
    return path;
}

export async function whatsappLinkPathFind(
    serverRuntime: ServerRuntime,
    args: {
        purpose: OutboundWhatsAppPurpose;
        locale: Locale;
        userId?: string | null;
        relatedEntity?: { type: OutboundWhatsAppRelatedEntityType; id: string };
    },
): Promise<string> {
    const entity = args.relatedEntity;
    if (!entity) throw new Error('WhatsApp link requires a related booking');
    const prefix = args.locale === 'en' ? '/en' : '';
    if (entity.type === 'BOOKING_REQUEST') {
        return whatsappLinkPathAssert(
            `${prefix}/profile/${args.purpose === 'BOOKING_REQUEST_COOK_NOTIFY' ? 'booking-request-pool' : 'booking-requests'}/${entity.id}`,
        );
    }
    const offerId =
        entity.type === 'COOK_CALL_SLOT_BOOKING'
            ? (
                  await serverRuntime.db
                      .select({ id: cookCallSlotBookings.bookingRequestOfferId })
                      .from(cookCallSlotBookings)
                      .where(eq(cookCallSlotBookings.cookCallSlotBookingId, entity.id))
                      .limit(1)
              )[0]?.id
            : entity.type === 'BOOKING_REQUEST_OFFER'
              ? entity.id
              : undefined;
    if (!offerId) throw new Error('WhatsApp link booking not found');
    const [context] = await serverRuntime.db
        .select({ requestId: bookingRequests.bookingRequestId, customerId: bookingRequests.userId, cookId: bookingRequestOffers.cookId })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId))
        .limit(1);
    if (!context || !args.userId || (args.userId !== context.customerId && args.userId !== context.cookId)) {
        throw new Error('WhatsApp link recipient does not belong to this booking');
    }
    const path =
        args.userId === context.cookId
            ? `${prefix}/profile/booking-request-offers/${offerId}`
            : `${prefix}/profile/booking-requests/${context.requestId}/offers/${offerId}`;
    const tab = args.purpose.startsWith('CALL_SLOT_')
        ? 'call'
        : args.purpose.includes('CHAT_UNREAD') || args.purpose === 'BOOKING_REQUEST_OFFER_MENU_CHANGES_REQUESTED_COOK'
          ? 'chat'
          : args.purpose.startsWith('TESTIMONIAL_') && !args.purpose.includes('MEMORY_NUDGE')
            ? 'testimonial'
            : 'offer';
    return whatsappLinkPathAssert(`${path}?tab=${tab}`);
}

export async function whatsappLinkResponseCreate(serverRuntime: ServerRuntime, token: string, request: Request): Promise<Response> {
    const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
    if (!zNanoId.safeParse(token).success) return new Response(null, { status: 404, headers });
    const [message] = await serverRuntime.db
        .select({ linkPath: outboundWhatsAppMessages.linkPath, sentAt: outboundWhatsAppMessages.sentAt })
        .from(outboundWhatsAppMessages)
        .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, token))
        .limit(1);
    if (!message?.linkPath || !message.sentAt) return new Response(null, { status: 404, headers });
    const linkPath = whatsappLinkPathAssert(message.linkPath);
    const userAgent = request.headers.get('user-agent');
    const preview = request.headers.get('purpose') === 'prefetch' || request.headers.get('sec-purpose')?.includes('prefetch');
    if (request.method === 'GET' && userAgent && !isbot(userAgent) && !preview) {
        const now = new Date();
        try {
            await serverRuntime.db.transaction(async (transaction) => {
                await transaction
                    .update(outboundWhatsAppMessages)
                    .set({ linkClickedAt: sql`coalesce(${outboundWhatsAppMessages.linkClickedAt}, ${now})` })
                    .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, token));
                await transaction
                    .update(whatsAppMessages)
                    .set({ linkClickedAt: sql`coalesce(${whatsAppMessages.linkClickedAt}, ${now})` })
                    .where(eq(whatsAppMessages.outboundWhatsAppMessageId, token));
            });
            await serverRuntime.publish.adminUpdates();
        } catch (error) {
            serverRuntime.log.error(error, null);
        }
    }
    return new Response(null, { status: 302, headers: { ...headers, Location: linkPath } });
}
