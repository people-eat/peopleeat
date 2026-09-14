import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, cookTestimonials, customerTestimonials, users } from '../../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../../domain/bookingRequest';
import type { OutboundEmailPurpose } from '../../domain/outboundEmail';
import type { BookingRequestOfferTestimonialReminderKind } from '../../email/components/bookingRequestOfferTestimonialReminderEmailShared';
import {
    BookingRequestOfferTestimonialReminderForCookEmail,
    bookingRequestOfferTestimonialReminderForCookEmailSubject,
} from '../../email/templates/BookingRequestOfferTestimonialReminderForCookEmail';
import {
    BookingRequestOfferTestimonialReminderForCustomerEmail,
    bookingRequestOfferTestimonialReminderForCustomerEmailSubject,
} from '../../email/templates/BookingRequestOfferTestimonialReminderForCustomerEmail';
import { environmentVariables } from '../../env/environmentVariablesCreate';
import { emailAddressPresent } from '../../utils/emailAddressPresent';
import type { QueuedJobDefinition } from '../types';

interface BookingRequestOfferTestimonialReminderData {
    bookingRequestOfferId: string;
    kind: BookingRequestOfferTestimonialReminderKind;
}

function purposeFor(kind: BookingRequestOfferTestimonialReminderKind, audience: 'CUSTOMER' | 'COOK'): OutboundEmailPurpose {
    if (kind === 'MEMORY_NUDGE') {
        return audience === 'CUSTOMER' ? 'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER' : 'TESTIMONIAL_MEMORY_NUDGE_COOK';
    }
    if (kind === 'REMINDER_MORNING') {
        return audience === 'CUSTOMER' ? 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER' : 'TESTIMONIAL_REMINDER_MORNING_COOK';
    }
    return audience === 'CUSTOMER' ? 'TESTIMONIAL_REMINDER_EVENING_CUSTOMER' : 'TESTIMONIAL_REMINDER_EVENING_COOK';
}

export const bookingRequestOfferTestimonialReminder: QueuedJobDefinition<BookingRequestOfferTestimonialReminderData> = {
    kind: 'queued',
    name: 'booking-request-offer-testimonial-reminder',
    handler: async ({ data, serverRuntime }) => {
        const [result] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
                customer: users,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId))
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, data.bookingRequestOfferId))
            .limit(1);

        if (!result) {
            return;
        }

        const { offer, bookingRequest, customer } = result;

        if (
            bookingRequest.canceledAt ||
            !(offer.userAccepted === true && offer.cookAccepted === true) ||
            !bookingRequestOfferPaymentIsPaid(offer.paymentStatus)
        ) {
            return;
        }

        const customerWithEmail = emailAddressPresent(customer);
        const [cookUserRow] = await serverRuntime.db.select().from(users).where(eq(users.userId, offer.cookId)).limit(1);
        const cookUser = emailAddressPresent(cookUserRow);
        if (!customerWithEmail || !cookUser) {
            return;
        }

        const [[customerTestimonial], [cookTestimonial]] = await Promise.all([
            serverRuntime.db
                .select({ id: customerTestimonials.customerTestimonialId })
                .from(customerTestimonials)
                .where(eq(customerTestimonials.bookingRequestOfferId, data.bookingRequestOfferId))
                .limit(1),
            serverRuntime.db
                .select({ id: cookTestimonials.cookTestimonialId })
                .from(cookTestimonials)
                .where(eq(cookTestimonials.bookingRequestOfferId, data.bookingRequestOfferId))
                .limit(1),
        ]);

        const webPageUrl = environmentVariables.webPageUrl.replace(/\/$/, '');
        const customerLocale = customerWithEmail.locale;
        const cookLocale = cookUser.locale;
        const tabSuffix = data.kind === 'MEMORY_NUDGE' ? '' : '?tab=testimonial';
        const customerPrimaryUrl = `${webPageUrl}/profile/booking-requests/${bookingRequest.bookingRequestId}/offers/${data.bookingRequestOfferId}${tabSuffix}`;
        const cookPrimaryUrl = `${webPageUrl}/profile/booking-request-offers/${data.bookingRequestOfferId}${tabSuffix}`;

        const sends: Promise<unknown>[] = [];

        if (!customerTestimonial) {
            sends.push(
                serverRuntime.email.send({
                    to: customerWithEmail.emailAddress,
                    subject: bookingRequestOfferTestimonialReminderForCustomerEmailSubject(customerLocale, data.kind),
                    react: BookingRequestOfferTestimonialReminderForCustomerEmail({
                        locale: customerLocale,
                        webPageUrl,
                        recipientFirstName: customerWithEmail.firstName,
                        counterpartyFirstName: cookUser.firstName,
                        primaryUrl: customerPrimaryUrl,
                        kind: data.kind,
                    }),
                    purpose: purposeFor(data.kind, 'CUSTOMER'),
                    locale: customerLocale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: data.bookingRequestOfferId },
                    userId: customerWithEmail.userId,
                }),
            );
        }

        if (!cookTestimonial) {
            sends.push(
                serverRuntime.email.send({
                    to: cookUser.emailAddress,
                    subject: bookingRequestOfferTestimonialReminderForCookEmailSubject(cookLocale, data.kind),
                    react: BookingRequestOfferTestimonialReminderForCookEmail({
                        locale: cookLocale,
                        webPageUrl,
                        recipientFirstName: cookUser.firstName,
                        counterpartyFirstName: customerWithEmail.firstName,
                        primaryUrl: cookPrimaryUrl,
                        kind: data.kind,
                    }),
                    purpose: purposeFor(data.kind, 'COOK'),
                    locale: cookLocale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: data.bookingRequestOfferId },
                    userId: cookUser.userId,
                }),
            );
        }

        if (sends.length > 0) {
            await Promise.all(sends);
            const { slackNotifyTestimonialReminderSent } = await import('../../slack/slackNotifyBooking');
            await slackNotifyTestimonialReminderSent(serverRuntime, {
                bookingRequestId: bookingRequest.bookingRequestId,
                kind: data.kind,
            });
        }
    },
    options: {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
