import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { bookingRequestOffers, bookingRequests, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { SlackField } from './slackBlocks';
import { slackFormatCents, slackFormatCity, slackFormatDateTime } from './slackFormat';

const cookUsers = alias(users, 'CookUsers');

export type BookingRequestSlackSummary = {
    bookingRequestId: string;
    customerName: string;
    dateTime: Date;
    city: string;
    occasion: string;
    cookName?: string;
    totalCentsCustomer?: number;
};

/**
 * Load human booking (and optional offer) facts for Slack thread enrichment.
 */
export async function bookingRequestSlackSummaryLoad(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; bookingRequestOfferId?: string },
): Promise<BookingRequestSlackSummary | undefined> {
    if (args.bookingRequestOfferId) {
        const [row] = await serverRuntime.db
            .select({
                bookingRequestId: bookingRequests.bookingRequestId,
                dateTime: bookingRequests.dateTime,
                occasion: bookingRequests.occasion,
                exactEventAddress: bookingRequests.exactEventAddress,
                customerFirstName: users.firstName,
                customerLastName: users.lastName,
                cookFirstName: cookUsers.firstName,
                cookLastName: cookUsers.lastName,
                totalCentsCustomer: bookingRequestOffers.totalCentsCustomer,
            })
            .from(bookingRequests)
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .innerJoin(cookUsers, eq(cookUsers.userId, cooks.cookId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId))
            .limit(1);

        if (!row || row.bookingRequestId !== args.bookingRequestId) {
            return undefined;
        }

        return {
            bookingRequestId: row.bookingRequestId,
            customerName: `${row.customerFirstName} ${row.customerLastName}`,
            dateTime: row.dateTime,
            city: slackFormatCity(row.exactEventAddress),
            occasion: row.occasion,
            cookName: `${row.cookFirstName} ${row.cookLastName}`,
            totalCentsCustomer: row.totalCentsCustomer ?? undefined,
        };
    }

    const [row] = await serverRuntime.db
        .select({
            bookingRequestId: bookingRequests.bookingRequestId,
            dateTime: bookingRequests.dateTime,
            occasion: bookingRequests.occasion,
            exactEventAddress: bookingRequests.exactEventAddress,
            firstName: users.firstName,
            lastName: users.lastName,
        })
        .from(bookingRequests)
        .innerJoin(users, eq(users.userId, bookingRequests.userId))
        .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
        .limit(1);

    if (!row) {
        return undefined;
    }

    return {
        bookingRequestId: row.bookingRequestId,
        customerName: `${row.firstName} ${row.lastName}`,
        dateTime: row.dateTime,
        city: slackFormatCity(row.exactEventAddress),
        occasion: row.occasion,
    };
}

export function bookingRequestSlackSummaryFields(
    summary: BookingRequestSlackSummary,
    options?: { includeCook?: boolean; includePrice?: boolean; amountCents?: number; amountLabel?: string },
): SlackField[] {
    const fields: SlackField[] = [
        { label: 'Datum', value: slackFormatDateTime(summary.dateTime) },
        { label: 'Ort', value: summary.city },
        { label: 'Anlass', value: summary.occasion },
    ];
    if (options?.includeCook !== false && summary.cookName) {
        fields.push({ label: 'Koch', value: summary.cookName });
    }
    const amountCents = options?.amountCents ?? (options?.includePrice ? summary.totalCentsCustomer : undefined);
    if (amountCents != null) {
        fields.push({ label: options?.amountLabel ?? 'Kundenpreis', value: slackFormatCents(amountCents) });
    }
    return fields;
}
