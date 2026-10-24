import { eq } from 'drizzle-orm';

import {
    bookingRequestOfferMenuPriceScaleByPaidParticipants,
    bookingRequestOfferPriceCalculate,
} from '../../shared/bookingRequestOfferPrice';
import { bookingRequestPaidParticipants } from '../../shared/bookingRequestOfferPriceGuidance';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, giftCards, promoCodes, users } from '../db/schema';
import type { BookingRequestParticipantType } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSUserBookingRequest,
    GqlSUserBookingRequestOfferPriceImpact,
    GqlSUserBookingRequestPriceImpactArgs,
} from '../graphql/generated';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from '../utils/bookingRequestOfferParticipantAmendmentPrice';

/**
 * Preview menu / total changes for a proposed headcount on an owned booking
 * request. Used by the customer / admin edit form before save.
 * Dual-accepted offers use the amendment price helper (promo + gift re-apply)
 * so the customer total matches what a participant amendment would charge.
 */
export async function userBookingRequestPriceImpactFindMany(
    parent: Pick<GqlSUserBookingRequest, 'bookingRequestId'>,
    args: Pick<GqlSUserBookingRequestPriceImpactArgs, 'participantsAdult' | 'participantsDiscounted'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserBookingRequestOfferPriceImpact[]> {
    const participantsAdultAfter = Math.max(0, args.participantsAdult);
    const participantsDiscountedAfter = Math.max(0, args.participantsDiscounted);
    const paidAfter = bookingRequestPaidParticipants(participantsAdultAfter, participantsDiscountedAfter);
    if (paidAfter <= 0) {
        return [];
    }

    const existingParticipants = await serverRuntime.db
        .select()
        .from(bookingRequestParticipants)
        .where(eq(bookingRequestParticipants.bookingRequestId, parent.bookingRequestId));
    const adultsBefore = existingParticipants.filter((participant) => participant.type === 'ADULT').length;
    const discountedBefore = existingParticipants.filter((participant) => participant.type === 'DISCOUNTED').length;
    const paidBefore = bookingRequestPaidParticipants(adultsBefore, discountedBefore);
    if (paidBefore <= 0) {
        return [];
    }

    const participantsAfter: { type: BookingRequestParticipantType }[] = [
        ...Array.from({ length: participantsAdultAfter }, () => ({ type: 'ADULT' as const })),
        ...Array.from({ length: participantsDiscountedAfter }, () => ({ type: 'DISCOUNTED' as const })),
    ];

    const rows = await serverRuntime.db
        .select({
            offer: bookingRequestOffers,
            bookingRequest: bookingRequests,
            cookUser: users,
            giftCard: giftCards,
            promoCode: promoCodes,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .leftJoin(giftCards, eq(giftCards.giftCardId, bookingRequests.giftCardId))
        .leftJoin(promoCodes, eq(promoCodes.promoCodeId, bookingRequests.promoCodeId))
        .where(eq(bookingRequestOffers.bookingRequestId, parent.bookingRequestId));

    return rows.map((row) => {
        const dualAccepted = row.offer.userAccepted === true && row.offer.cookAccepted === true;
        const cookDisplay = row.cookUser.firstName.trim() || row.cookUser.emailAddress || 'Cook';

        if (dualAccepted) {
            const totalCentsCustomerBefore = row.offer.totalCentsCustomer ?? row.offer.totalWithoutDiscountsCentsCustomer;
            const pricePreview = bookingRequestOfferParticipantAmendmentPriceCalculate(
                {
                    menuPriceCentsBefore: row.offer.menuPriceCents,
                    travelExpensesCentsAfter: row.offer.travelExpensesCents,
                    totalWithoutDiscountsCentsCustomerBefore: row.offer.totalWithoutDiscountsCentsCustomer,
                    totalCentsCustomerBefore,
                    giftCardAppliedCentsBefore: row.offer.giftCardAppliedCents,
                    giftCardBalanceCents: row.giftCard?.balanceCents ?? 0,
                    promoAmountCents: row.promoCode?.amountCents ?? 0,
                    participantsBefore: existingParticipants,
                    participantsAfter,
                    scaleMenuByParticipants: true,
                    platformFeePercentCook: row.offer.platformFeePercentCook,
                    platformFeePercentCustomer: row.offer.platformFeePercentCustomer,
                },
                row.offer.payoutCentsCook,
            );
            return {
                bookingRequestOfferId: row.offer.bookingRequestOfferId,
                cookDisplay,
                menuPriceCentsBefore: row.offer.menuPriceCents,
                menuPriceCentsAfter: pricePreview.menuPriceCentsAfter,
                totalWithoutDiscountsCentsCustomerBefore: row.offer.totalWithoutDiscountsCentsCustomer,
                totalWithoutDiscountsCentsCustomerAfter: pricePreview.totalWithoutDiscountsCentsCustomerAfter,
                totalCentsCustomerBefore,
                totalCentsCustomerAfter: pricePreview.totalCentsCustomerAfter,
                payoutCentsCookBefore: row.offer.payoutCentsCook,
                payoutCentsCookAfter: pricePreview.payoutCentsCookAfter,
            };
        }

        const menuPriceCentsAfter = bookingRequestOfferMenuPriceScaleByPaidParticipants({
            menuPriceCents: row.offer.menuPriceCents,
            paidParticipantsBefore: paidBefore,
            paidParticipantsAfter: paidAfter,
        });
        const priceAfter = bookingRequestOfferPriceCalculate({
            menuPriceCents: menuPriceCentsAfter,
            travelExpensesCents: row.offer.travelExpensesCents,
            platformFeePercentCook: row.offer.platformFeePercentCook,
            platformFeePercentCustomer: row.offer.platformFeePercentCustomer,
        });
        const totalCentsCustomerBefore = row.offer.totalCentsCustomer ?? row.offer.totalWithoutDiscountsCentsCustomer;
        const discountCents = Math.max(0, row.offer.totalWithoutDiscountsCentsCustomer - totalCentsCustomerBefore);
        const totalCentsCustomerAfter = Math.max(0, priceAfter.totalWithoutDiscountsCentsCustomer - discountCents);
        return {
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            cookDisplay,
            menuPriceCentsBefore: row.offer.menuPriceCents,
            menuPriceCentsAfter: priceAfter.menuPriceCents,
            totalWithoutDiscountsCentsCustomerBefore: row.offer.totalWithoutDiscountsCentsCustomer,
            totalWithoutDiscountsCentsCustomerAfter: priceAfter.totalWithoutDiscountsCentsCustomer,
            totalCentsCustomerBefore,
            totalCentsCustomerAfter,
            payoutCentsCookBefore: row.offer.payoutCentsCook,
            payoutCentsCookAfter: priceAfter.payoutCentsCook,
        };
    });
}
