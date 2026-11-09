import { notFound } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

import { DEFAULT_TIME_ZONE } from '../../shared';
import type {
    BookingRequestOfferCookStatementPageProps,
    BookingRequestOfferCustomerReceiptPageProps,
    BookingRequestOfferPaymentDocumentAddress,
} from '../../web/pages/BookingRequestOfferPaymentDocumentPage';
import { db } from '../db';
import { bookingRequestOffers, bookingRequests, users } from '../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import { verifyServerToken } from './serverToken';

// Server-only loader for `/server/booking-request-offers/:id/customer-receipt`
// and `.../cook-statement`. Imported from `createIsomorphicFn().server` so the
// route module does not pull `pg` into the client route tree.

type LoadedDocument = {
    customer: BookingRequestOfferCustomerReceiptPageProps;
    cook: BookingRequestOfferCookStatementPageProps;
};

export async function bookingRequestOfferPaymentDocumentLoadServer(input: {
    bookingRequestOfferId: string;
    token: string;
}): Promise<LoadedDocument> {
    if (!verifyServerToken(input.token, input.bookingRequestOfferId)) {
        throw notFound();
    }

    const [row] = await db
        .select({
            offer: bookingRequestOffers,
            occasion: bookingRequests.occasion,
            eventAt: bookingRequests.dateTime,
            exactEventAddress: bookingRequests.exactEventAddress,
            invoiceAddress: bookingRequests.invoiceAddress,
            customerFirstName: users.firstName,
            customerLastName: users.lastName,
            customerLocale: users.locale,
            customerTimeZone: users.timeZone,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(users, eq(users.userId, bookingRequests.userId))
        .where(eq(bookingRequestOffers.bookingRequestOfferId, input.bookingRequestOfferId))
        .limit(1);

    if (!row || !bookingRequestOfferPaymentIsPaid(row.offer.paymentStatus)) {
        throw notFound();
    }

    const [cook] = await db
        .select({
            firstName: users.firstName,
            locale: users.locale,
            timeZone: users.timeZone,
        })
        .from(users)
        .where(eq(users.userId, row.offer.cookId))
        .limit(1);

    if (!cook) {
        throw notFound();
    }

    const collectedCents = row.offer.totalCentsCustomer ?? row.offer.totalWithoutDiscountsCentsCustomer;
    const discountCents = Math.max(0, row.offer.totalWithoutDiscountsCentsCustomer - collectedCents);
    const giftCardAppliedCents = Math.min(Math.max(0, row.offer.giftCardAppliedCents), discountCents);
    const promoDiscountCents = discountCents - giftCardAppliedCents;
    const invoiceAddress = addressFromInvoice(row.invoiceAddress);
    const guestName = invoiceAddress
        ? `${invoiceAddress.firstName} ${invoiceAddress.lastName}`.trim()
        : `${row.customerFirstName} ${row.customerLastName}`.trim();
    const paidAt = row.offer.paymentDateTime ?? row.offer.createdAt;

    return {
        customer: {
            kind: 'customer-receipt',
            locale: row.customerLocale,
            timeZone: row.customerTimeZone || DEFAULT_TIME_ZONE,
            paidAt,
            eventAt: row.eventAt,
            bookingRequestId: row.offer.bookingRequestId,
            occasion: row.occasion,
            venueCountry: row.exactEventAddress.country,
            venueCity: row.exactEventAddress.city,
            invoiceAddress,
            cookName: cook.firstName,
            menuPriceCents: row.offer.menuPriceCents,
            travelExpensesCents: row.offer.travelExpensesCents,
            platformFeeCentsCustomer: row.offer.platformFeeCentsCustomer,
            paymentProviderFeeCents: row.offer.paymentProviderFeeCents,
            giftCardAppliedCents,
            promoDiscountCents,
            totalCentsCustomer: collectedCents,
        },
        cook: {
            kind: 'cook-statement',
            locale: cook.locale,
            timeZone: cook.timeZone || DEFAULT_TIME_ZONE,
            paidAt,
            eventAt: row.eventAt,
            bookingRequestId: row.offer.bookingRequestId,
            occasion: row.occasion,
            venueCountry: row.exactEventAddress.country,
            venueCity: row.exactEventAddress.city,
            invoiceAddress,
            guestName,
            menuPriceCents: row.offer.menuPriceCents,
            travelExpensesCents: row.offer.travelExpensesCents,
            platformFeeCentsCook: row.offer.platformFeeCentsCook,
            payoutCentsCook: row.offer.payoutCentsCook,
        },
    };
}

function addressFromInvoice(
    invoiceAddress: {
        companyName?: string | null;
        firstName: string;
        lastName: string;
        country: string;
        city: string;
        postalCode: string;
        line1: string;
        line2: string;
    } | null,
): BookingRequestOfferPaymentDocumentAddress | null {
    if (!invoiceAddress) {
        return null;
    }
    return {
        companyName: invoiceAddress.companyName ?? null,
        firstName: invoiceAddress.firstName,
        lastName: invoiceAddress.lastName,
        country: invoiceAddress.country,
        city: invoiceAddress.city,
        postalCode: invoiceAddress.postalCode,
        line1: invoiceAddress.line1,
        line2: invoiceAddress.line2,
    };
}
