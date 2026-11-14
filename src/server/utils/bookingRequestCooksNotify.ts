import { inArray } from 'drizzle-orm';

import { users } from '../db/schema';
import type { BookingRequestCookRequestedMenu } from '../domain/bookingRequest';
import { notificationEmailAllowed } from '../domain/notificationSettings';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    BookingRequestCooksNotifyForCookEmail,
    bookingRequestCooksNotifyForCookEmailSubject,
} from '../email/templates/BookingRequestCooksNotifyForCookEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { bookingRequestCookNotifyWhatsAppSend } from './bookingRequestLifecycleWhatsApp';
import { bookingRequestCookNotifiedUpsert } from './cookIdsCanCreateOffersFind';
import { emailAddressPresent } from './emailAddressPresent';

export type BookingRequestCooksNotifyContext = {
    bookingRequestId: string;
    occasion: string;
    dateTime: Date;
    city: string;
    country?: string | null;
};

/**
 * Stamp cook↔request affinity, push live updates, and email cooks about a new
 * (or newly approved) booking request in their travel radius. Email sends run
 * in parallel; Resend pacing lives in `serverRuntime.email.send`
 * (`resendSendRateLimit`). Email failures are logged and do not undo the notify
 * stamp / SSE.
 */
export async function bookingRequestCooksNotify(
    serverRuntime: ServerRuntime,
    cookIds: string[],
    context: BookingRequestCooksNotifyContext,
    options?: { direct?: boolean; requestedMenu?: BookingRequestCookRequestedMenu | null },
): Promise<void> {
    if (cookIds.length === 0) {
        return;
    }

    const requestedMenu = options?.direct === true && cookIds.length === 1 ? (options.requestedMenu ?? null) : null;

    await Promise.all(
        cookIds.map((cookId) =>
            bookingRequestCookNotifiedUpsert(serverRuntime, {
                cookId,
                bookingRequestId: context.bookingRequestId,
                requestedMenu,
            }),
        ),
    );

    await Promise.all(cookIds.map((cookId) => serverRuntime.publish.userUpdates({ userId: cookId })));

    const cookUsers = await serverRuntime.db
        .select({
            userId: users.userId,
            emailAddress: users.emailAddress,
            firstName: users.firstName,
            locale: users.locale,
            timeZone: users.timeZone,
            notificationSettings: users.notificationSettings,
        })
        .from(users)
        .where(inArray(users.userId, cookIds));

    const webPageUrl = environmentVariables.webPageUrl.replace(/\/$/, '');
    const poolUrl = `${webPageUrl}/profile/booking-request-pool/${context.bookingRequestId}`;

    await Promise.all(
        cookUsers.map(async (cookUserRow) => {
            const cookUser = emailAddressPresent(cookUserRow);
            if (!cookUser) {
                return;
            }
            const locale = cookUser.locale;
            const emailPurpose = options?.direct ? 'BOOKING_REQUEST_COOK_DIRECT_NOTIFY' : 'BOOKING_REQUEST_COOK_NOTIFY';
            const emailAllowed = notificationEmailAllowed(cookUser.notificationSettings, emailPurpose);
            const city = context.city.trim() || { de: 'deiner Nähe', en: 'your area' }[locale];
            try {
                if (emailAllowed) {
                    await serverRuntime.email.send({
                        to: cookUser.emailAddress,
                        subject: bookingRequestCooksNotifyForCookEmailSubject(locale, { direct: options?.direct === true }),
                        react: BookingRequestCooksNotifyForCookEmail({
                            locale,
                            timeZone: cookUser.timeZone,
                            venueCountry: context.country,
                            webPageUrl,
                            recipientFirstName: cookUser.firstName,
                            occasion: context.occasion,
                            dateTime: context.dateTime,
                            city,
                            poolUrl,
                            direct: options?.direct === true,
                            requestedMenuTitle: requestedMenu?.title ?? null,
                        }),
                        purpose: emailPurpose,
                        locale,
                        relatedEntity: { type: 'BOOKING_REQUEST', id: context.bookingRequestId },
                        userId: cookUser.userId,
                    });
                }
            } catch (error) {
                serverRuntime.log.error(
                    error instanceof Error
                        ? new Error(
                              `bookingRequestCooksNotify: email failed for cook ${cookUser.userId} on ${context.bookingRequestId}: ${error.message}`,
                              { cause: error },
                          )
                        : error,
                    null,
                );
            }

            if (!options?.direct) {
                await bookingRequestCookNotifyWhatsAppSend(serverRuntime, {
                    bookingRequestId: context.bookingRequestId,
                    cookUserId: cookUser.userId,
                    city,
                    country: context.country,
                    dateTime: context.dateTime,
                });
            }
        }),
    );
}
