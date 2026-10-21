import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants } from '../db/schema';
import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant, Cook, User } from '../db/schema';
import type { BookingRequestOfferParticipantAmendment, BookingRequestOfferPaymentData } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferExtraTransferMaybeCreate } from './bookingRequestOfferExtraTransferMaybeCreate';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from './bookingRequestOfferParticipantAmendmentPrice';
import { bookingRequestOfferPaymentPrepare } from './bookingRequestOfferPaymentPrepare';
import { bookingRequestOfferPriceSnapshot } from './bookingRequestOfferPriceSnapshot';

async function paymentTransferIdsResolve(
    serverRuntime: ServerRuntime,
    paymentData: BookingRequestOfferPaymentData | null,
): Promise<string[]> {
    if (!paymentData) return [];

    const transferIds: string[] = [];
    if ('extraTransferId' in paymentData && paymentData.extraTransferId) {
        transferIds.push(paymentData.extraTransferId);
    }
    if ('transferId' in paymentData && paymentData.transferId) {
        transferIds.push(paymentData.transferId);
    }

    const paymentIntentId = 'paymentIntentId' in paymentData ? paymentData.paymentIntentId : undefined;
    if (transferIds.length === 0 && paymentIntentId) {
        const destinationTransferId = await serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne(paymentIntentId);
        if (destinationTransferId) {
            transferIds.push(destinationTransferId);
        }
    }

    return transferIds;
}

async function cookPayoutDeltaReverse(serverRuntime: ServerRuntime, transferIds: string[], amountCents: number): Promise<void> {
    if (amountCents <= 0) return;
    if (transferIds.length === 0) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: no Connect transfers to reverse for cook payout decrease');
    }
    // Prefer reversing from the top-up transfer first, then the destination transfer.
    // Amount is the cook payout delta; it must fit within the reversed transfer's remaining amount.
    await serverRuntime.stripe.transferReverse({ transferId: transferIds[0]!, amountCents });
}

function paymentDataWithRefund(
    paymentData: BookingRequestOfferPaymentData | null,
    refundId: string,
): BookingRequestOfferPaymentData | null {
    if (!paymentData) return paymentData;
    const refundIds = 'refundIds' in paymentData && paymentData.refundIds ? [...paymentData.refundIds, refundId] : [refundId];
    return { ...paymentData, refundIds };
}

function paymentDataWithAmendmentPaymentIntent(
    paymentData: BookingRequestOfferPaymentData | null,
    amendmentPaymentIntentId: string,
    transferId?: string,
    extraTransferId?: string,
): BookingRequestOfferPaymentData | null {
    if (!paymentData) return paymentData;
    const amendmentPaymentIntentIds =
        'amendmentPaymentIntentIds' in paymentData && paymentData.amendmentPaymentIntentIds
            ? [...paymentData.amendmentPaymentIntentIds, amendmentPaymentIntentId]
            : [amendmentPaymentIntentId];
    return {
        ...paymentData,
        amendmentPaymentIntentIds,
        ...(transferId && !('transferId' in paymentData && paymentData.transferId) ? { transferId } : {}),
        ...(extraTransferId ? { extraTransferId } : {}),
    };
}

/**
 * Apply a pending participant amendment: replace participants, reprice, Stripe delta.
 * Caller must have validated dual-accept, pending amendment, and allowed payment status.
 */
export async function bookingRequestOfferParticipantAmendmentApply(
    serverRuntime: ServerRuntime,
    input: {
        offer: BookingRequestOffer;
        bookingRequest: BookingRequest;
        cook: Cook;
        customer: User;
        existingParticipants: BookingRequestParticipant[];
        amendment: BookingRequestOfferParticipantAmendment;
    },
): Promise<void> {
    const { offer, bookingRequest, cook, customer, existingParticipants, amendment } = input;

    if (!cook.stripeAccountId) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: cook has no Stripe account');
    }
    if (!customer.emailAddress) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: customer has no email');
    }

    const totalCentsCustomerBefore = offer.totalCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer;
    const price = bookingRequestOfferParticipantAmendmentPriceCalculate(
        {
            menuPriceCentsBefore: offer.menuPriceCents,
            travelExpensesCents: offer.travelExpensesCents,
            totalWithoutDiscountsCentsCustomerBefore: offer.totalWithoutDiscountsCentsCustomer,
            totalCentsCustomerBefore,
            participantsBefore: existingParticipants,
            participantsAfter: amendment.participants,
        },
        offer.payoutCentsCook,
    );

    const adultsBefore = existingParticipants.filter((p) => p.type === 'ADULT').length;
    const discountedBefore = existingParticipants.filter((p) => p.type === 'DISCOUNTED').length;
    const adultsAfter = amendment.participants.filter((p) => p.type === 'ADULT').length;
    const discountedAfter = amendment.participants.filter((p) => p.type === 'DISCOUNTED').length;

    const priceBeforeSnapshot = bookingRequestOfferPriceSnapshot(offer);
    const priceChanged =
        price.menuPriceCentsAfter !== offer.menuPriceCents ||
        price.payoutCentsCookAfter !== offer.payoutCentsCook ||
        price.totalWithoutDiscountsCentsCustomerAfter !== offer.totalWithoutDiscountsCentsCustomer;

    let nextPaymentStatus = offer.paymentStatus;
    let nextPaymentData = offer.paymentData;
    let nextPlannedPaymentPullDateTime = offer.plannedPaymentPullDateTime;
    let nextPaymentDateTime = offer.paymentDateTime;

    if (offer.paymentStatus === 'EMPTY') {
        if (offer.paymentData && 'paymentIntentId' in offer.paymentData && offer.paymentData.paymentIntentId) {
            await serverRuntime.stripe.paymentIntentCancel(offer.paymentData.paymentIntentId);
        }
        const prepared = await bookingRequestOfferPaymentPrepare(serverRuntime, {
            userId: customer.userId,
            emailAddress: customer.emailAddress,
            firstName: customer.firstName,
            lastName: customer.lastName,
            destinationAccountId: cook.stripeAccountId,
            totalCentsCustomer: price.totalCentsCustomerAfter,
            payoutCentsCook: price.payoutCentsCookAfter,
            eventDateTime: bookingRequest.dateTime,
        });
        nextPaymentStatus = prepared.paymentStatus;
        nextPaymentData = prepared.paymentData;
        nextPlannedPaymentPullDateTime = prepared.plannedPaymentPullDateTime;
        nextPaymentDateTime = prepared.paymentStatus === 'PAYED' ? new Date() : offer.paymentDateTime;
    } else if (offer.paymentStatus === 'SETUP') {
        // Pull job reads updated columns; no Stripe money move yet.
    } else if (offer.paymentStatus === 'PAYED') {
        const customerDelta = price.customerDeltaCents;
        const cookDelta = price.cookPayoutDeltaCents;

        if (customerDelta < 0) {
            const paymentIntentId =
                offer.paymentData && 'paymentIntentId' in offer.paymentData ? offer.paymentData.paymentIntentId : undefined;
            if (paymentIntentId) {
                const { refundId } = await serverRuntime.stripe.paymentIntentRefund(paymentIntentId, Math.abs(customerDelta));
                nextPaymentData = paymentDataWithRefund(nextPaymentData, refundId);
            }
        } else if (customerDelta > 0) {
            const setupIntentId = offer.paymentData && 'setupIntentId' in offer.paymentData ? offer.paymentData.setupIntentId : undefined;
            const priorPaymentIntentId =
                offer.paymentData && 'paymentIntentId' in offer.paymentData ? offer.paymentData.paymentIntentId : undefined;
            let paymentMethodId: string | undefined;
            if (setupIntentId) {
                paymentMethodId = await serverRuntime.stripe.setupIntentPaymentMethodIdFindOne(setupIntentId);
            }
            if (!paymentMethodId && priorPaymentIntentId) {
                paymentMethodId = await serverRuntime.stripe.paymentIntentPaymentMethodIdFindOne(priorPaymentIntentId);
            }
            if (!paymentMethodId) {
                throw new Error('bookingRequestOfferParticipantAmendmentApply: no saved payment method for increase charge');
            }
            const cookPayoutForSplit = Math.max(0, cookDelta);
            const { paymentIntentId } = await serverRuntime.stripe.paymentIntentCreateFromPaymentMethodWithSplit({
                destinationAccountId: cook.stripeAccountId,
                user: {
                    userId: customer.userId,
                    emailAddress: customer.emailAddress,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                },
                paymentMethodId,
                pullAmount: customerDelta,
                payoutAmount: cookPayoutForSplit,
            });
            const extraTransferId = await bookingRequestOfferExtraTransferMaybeCreate(serverRuntime, {
                destinationAccountId: cook.stripeAccountId,
                userId: customer.userId,
                totalCentsCustomer: customerDelta,
                payoutCentsCook: cookPayoutForSplit,
            });
            nextPaymentData = paymentDataWithAmendmentPaymentIntent(nextPaymentData, paymentIntentId, undefined, extraTransferId);
        }

        if (cookDelta < 0) {
            const transferIds = await paymentTransferIdsResolve(serverRuntime, offer.paymentData);
            await cookPayoutDeltaReverse(serverRuntime, transferIds, Math.abs(cookDelta));
        } else if (cookDelta > 0 && customerDelta <= 0) {
            const { transferId } = await serverRuntime.stripe.transferCreate({
                destinationAccountId: cook.stripeAccountId,
                payoutAmount: cookDelta,
            });
            if (nextPaymentData && !('extraTransferId' in nextPaymentData && nextPaymentData.extraTransferId)) {
                nextPaymentData = { ...nextPaymentData, extraTransferId: transferId };
            }
        }
    } else {
        throw new Error(`bookingRequestOfferParticipantAmendmentApply: unsupported paymentStatus ${offer.paymentStatus}`);
    }

    const participantInserts = amendment.participants.map((participant) => ({
        bookingRequestParticipantId: idCreate(),
        bookingRequestId: bookingRequest.bookingRequestId,
        type: participant.type,
        name: participant.name,
        restrictions: participant.restrictions,
    }));

    const acceptEventId = idCreate();
    const systemPriceEventId = priceChanged ? idCreate() : null;

    await serverRuntime.db.transaction(async (transaction) => {
        await transaction
            .delete(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequest.bookingRequestId));
        await transaction.insert(bookingRequestParticipants).values(participantInserts);

        await transaction
            .update(bookingRequestOffers)
            .set({
                menuPriceCents: price.menuPriceCentsAfter,
                travelExpensesCents: price.travelExpensesCents,
                paymentProviderFeeCents: price.paymentProviderFeeCents,
                platformFeePercentCook: price.platformFeePercentCook,
                platformFeePercentCustomer: price.platformFeePercentCustomer,
                platformFeeCentsCook: price.platformFeeCentsCook,
                platformFeeCentsCustomer: price.platformFeeCentsCustomer,
                payoutCentsCook: price.payoutCentsCookAfter,
                totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomerAfter,
                totalCentsCustomer: price.totalCentsCustomerAfter,
                paymentStatus: nextPaymentStatus,
                paymentData: nextPaymentData,
                plannedPaymentPullDateTime: nextPlannedPaymentPullDateTime,
                paymentDateTime: nextPaymentDateTime,
                participantAmendment: null,
                userUnreadNotificationCount: offer.userUnreadNotificationCount + 1,
            })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offer.bookingRequestOfferId));

        await transaction.insert(bookingRequestOfferEvents).values({
            bookingRequestOfferEventId: acceptEventId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
            type: 'COOK_PARTICIPANT_AMENDMENT_ACCEPTED',
            payload: {
                participantsAdultBefore: adultsBefore,
                participantsDiscountedBefore: discountedBefore,
                participantsAdultAfter: adultsAfter,
                participantsDiscountedAfter: discountedAfter,
                menuPriceCentsBefore: offer.menuPriceCents,
                menuPriceCentsAfter: price.menuPriceCentsAfter,
                totalCentsCustomerBefore,
                totalCentsCustomerAfter: price.totalCentsCustomerAfter,
                payoutCentsCookBefore: offer.payoutCentsCook,
                payoutCentsCookAfter: price.payoutCentsCookAfter,
                customerDeltaCents: price.customerDeltaCents,
                cookPayoutDeltaCents: price.cookPayoutDeltaCents,
            },
        });

        if (systemPriceEventId && priceChanged) {
            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: systemPriceEventId,
                bookingRequestOfferId: offer.bookingRequestOfferId,
                type: 'SYSTEM_CHANGED_PRICE',
                payload: {
                    priceBefore: priceBeforeSnapshot,
                    priceAfter: {
                        platformFeePercentCook: price.platformFeePercentCook,
                        platformFeePercentCustomer: price.platformFeePercentCustomer,
                        travelExpensesCents: price.travelExpensesCents,
                        menuPriceCents: price.menuPriceCentsAfter,
                        paymentProviderFeeCents: price.paymentProviderFeeCents,
                        platformFeeCentsCook: price.platformFeeCentsCook,
                        platformFeeCentsCustomer: price.platformFeeCentsCustomer,
                        payoutCentsCook: price.payoutCentsCookAfter,
                        totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomerAfter,
                    },
                },
            });
        }
    });
}
