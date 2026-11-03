import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, users } from '../../db/schema';
import { notificationEmailAllowed } from '../../domain/notificationSettings';
import { bookingRequestOfferCallSlotOfferUrls } from '../../email/components/bookingRequestOfferCallSlotEmailFormat';
import {
    BookingRequestOfferCallSlotReminderForCookEmail,
    bookingRequestOfferCallSlotReminderForCookEmailSubject,
} from '../../email/templates/BookingRequestOfferCallSlotReminderForCookEmail';
import {
    BookingRequestOfferCallSlotReminderForCustomerEmail,
    bookingRequestOfferCallSlotReminderForCustomerEmailSubject,
} from '../../email/templates/BookingRequestOfferCallSlotReminderForCustomerEmail';
import { environmentVariables } from '../../env/environmentVariablesCreate';
import { bookingRequestOfferCallSlotReminderWhatsAppSend } from '../../utils/bookingRequestOfferCallSlotWhatsApp';
import { emailAddressPresent } from '../../utils/emailAddressPresent';
import type { QueuedJobDefinition } from '../types';

interface BookingRequestOfferCallSlotReminderData {
    cookCallSlotBookingId: string;
}

export const bookingRequestOfferCallSlotReminder: QueuedJobDefinition<BookingRequestOfferCallSlotReminderData> = {
    kind: 'queued',
    name: 'booking-request-offer-call-slot-reminder',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                booking: cookCallSlotBookings,
                bookingRequestId: bookingRequests.bookingRequestId,
                customerUserId: bookingRequests.userId,
                cookId: bookingRequestOffers.cookId,
            })
            .from(cookCallSlotBookings)
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId))
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, data.cookCallSlotBookingId))
            .limit(1);

        if (!row || row.booking.status !== 'CONFIRMED') {
            return;
        }

        const [customer, cookUser] = await Promise.all([
            serverRuntime.db
                .select({
                    emailAddress: users.emailAddress,
                    firstName: users.firstName,
                    locale: users.locale,
                    timeZone: users.timeZone,
                    notificationSettings: users.notificationSettings,
                })
                .from(users)
                .where(eq(users.userId, row.customerUserId))
                .limit(1)
                .then((rows) => rows[0]),
            serverRuntime.db
                .select({
                    emailAddress: users.emailAddress,
                    firstName: users.firstName,
                    locale: users.locale,
                    timeZone: users.timeZone,
                    notificationSettings: users.notificationSettings,
                })
                .from(users)
                .where(eq(users.userId, row.cookId))
                .limit(1)
                .then((rows) => rows[0]),
        ]);

        const customerWithEmail = emailAddressPresent(customer);
        const cookUserWithEmail = emailAddressPresent(cookUser);
        if (!customerWithEmail || !cookUserWithEmail) {
            return;
        }

        const webPageUrl = environmentVariables.webPageUrl.replace(/\/$/, '');
        const customerLocale = customerWithEmail.locale;
        const cookLocale = cookUserWithEmail.locale;
        const urls = bookingRequestOfferCallSlotOfferUrls(webPageUrl, row.bookingRequestId, row.booking.bookingRequestOfferId);

        const sends: Promise<unknown>[] = [
            bookingRequestOfferCallSlotReminderWhatsAppSend(serverRuntime, {
                cookCallSlotBookingId: row.booking.cookCallSlotBookingId,
            }),
        ];
        if (notificationEmailAllowed(customerWithEmail.notificationSettings, 'CALL_SLOT_BOOKING_REMINDER', 'CUSTOMER')) {
            sends.push(
                serverRuntime.email.send({
                    to: customerWithEmail.emailAddress,
                    subject: bookingRequestOfferCallSlotReminderForCustomerEmailSubject(customerLocale),
                    react: BookingRequestOfferCallSlotReminderForCustomerEmail({
                        locale: customerLocale,
                        timeZone: customerWithEmail.timeZone,
                        webPageUrl,
                        recipientFirstName: customerWithEmail.firstName,
                        startAt: row.booking.startAt,
                        counterpartyFirstName: cookUserWithEmail.firstName,
                        offerUrl: urls.customer,
                    }),
                    purpose: 'CALL_SLOT_BOOKING_REMINDER',
                    locale: customerLocale,
                    relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: row.booking.cookCallSlotBookingId },
                    userId: row.customerUserId,
                }),
            );
        }
        if (notificationEmailAllowed(cookUserWithEmail.notificationSettings, 'CALL_SLOT_BOOKING_REMINDER', 'COOK')) {
            sends.push(
                serverRuntime.email.send({
                    to: cookUserWithEmail.emailAddress,
                    subject: bookingRequestOfferCallSlotReminderForCookEmailSubject(cookLocale),
                    react: BookingRequestOfferCallSlotReminderForCookEmail({
                        locale: cookLocale,
                        timeZone: cookUserWithEmail.timeZone,
                        webPageUrl,
                        recipientFirstName: cookUserWithEmail.firstName,
                        startAt: row.booking.startAt,
                        counterpartyFirstName: customerWithEmail.firstName,
                        offerUrl: urls.cook,
                    }),
                    purpose: 'CALL_SLOT_BOOKING_REMINDER',
                    locale: cookLocale,
                    relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: row.booking.cookCallSlotBookingId },
                    userId: row.cookId,
                }),
            );
        }
        await Promise.all(sends);
    },
    options: {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 7200,
    },
};
