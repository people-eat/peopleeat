import { and, eq } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { bookingRequestPaidParticipants } from '../../shared/bookingRequestOfferPriceGuidance';
import { bookingRequestOffers, bookingRequestParticipants, cookOfferAddons } from '../db/schema';
import type { BookingRequestOffer } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferAddonPriceFromRows } from './bookingRequestOfferAddonPriceFromRows';

type DbExecutor = Pick<ServerRuntime['db'], 'select' | 'update'>;

export type BookingRequestOfferAddonRepriceResult = {
    priceBefore: BookingRequestOffer;
    priceAfter: ReturnType<typeof bookingRequestOfferPriceCalculate>;
    addonRows: Awaited<ReturnType<typeof loadOfferAddonRows>>;
    paidParticipants: number;
};

async function loadOfferAddonRows(db: DbExecutor, bookingRequestOfferId: string) {
    return db.select().from(cookOfferAddons).where(eq(cookOfferAddons.bookingRequestOfferId, bookingRequestOfferId));
}

/**
 * Recompute `addonPriceCents` + fee snapshot from current offer-scoped addon
 * rows and paid headcount. Does not write timeline events.
 */
export async function bookingRequestOfferAddonReprice(
    db: DbExecutor,
    offer: BookingRequestOffer,
): Promise<BookingRequestOfferAddonRepriceResult> {
    const participants = await db
        .select({ type: bookingRequestParticipants.type })
        .from(bookingRequestParticipants)
        .where(eq(bookingRequestParticipants.bookingRequestId, offer.bookingRequestId));

    const adults = participants.filter((row) => row.type === 'ADULT').length;
    const discounted = participants.filter((row) => row.type === 'DISCOUNTED').length;
    const paidParticipants = bookingRequestPaidParticipants(adults, discounted);

    const addonRows = await loadOfferAddonRows(db, offer.bookingRequestOfferId);
    const addonPriceCents = bookingRequestOfferAddonPriceFromRows(addonRows, paidParticipants);
    const priceAfter = bookingRequestOfferPriceCalculate({
        menuPriceCents: offer.menuPriceCents,
        travelExpensesCents: offer.travelExpensesCents,
        addonPriceCents,
        platformFeePercentCook: offer.platformFeePercentCook,
        platformFeePercentCustomer: offer.platformFeePercentCustomer,
    });

    await db
        .update(bookingRequestOffers)
        .set({
            addonPriceCents: priceAfter.addonPriceCents,
            paymentProviderFeeCents: priceAfter.paymentProviderFeeCents,
            platformFeeCentsCook: priceAfter.platformFeeCentsCook,
            platformFeeCentsCustomer: priceAfter.platformFeeCentsCustomer,
            payoutCentsCook: priceAfter.payoutCentsCook,
            totalWithoutDiscountsCentsCustomer: priceAfter.totalWithoutDiscountsCentsCustomer,
        })
        .where(and(eq(bookingRequestOffers.bookingRequestOfferId, offer.bookingRequestOfferId)));

    return { priceBefore: offer, priceAfter, addonRows, paidParticipants };
}
