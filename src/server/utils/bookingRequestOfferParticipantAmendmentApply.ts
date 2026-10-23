import { and, eq, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant, Cook, GiftCard, PromoCode, User } from '../db/schema';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests } from '../db/schema';
import type {
    BookingRequestExactEventAddress,
    BookingRequestOfferParticipantAmendment,
    BookingRequestOfferPaymentData,
} from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestCookTravelDistanceKmClear } from './bookingRequestCookTravelDistanceKmEnsure';
import { bookingRequestOfferEventTomorrowNotifySchedule } from './bookingRequestOfferEventTomorrowNotifySchedule';
import { bookingRequestOfferExtraTransferMaybeCreate } from './bookingRequestOfferExtraTransferMaybeCreate';
import { bookingRequestOfferHasPendingDeltaPayment } from './bookingRequestOfferParticipantAmendmentGates';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from './bookingRequestOfferParticipantAmendmentPrice';
import {
    cookPayoutDeltaReverse,
    paymentDataWithExtraTransfer,
    paymentTransferIdsForCookReverse,
} from './bookingRequestOfferPaymentDataTransfers';
import { bookingRequestOfferPaymentPrepare } from './bookingRequestOfferPaymentPrepare';
import { bookingRequestOfferPriceSnapshot } from './bookingRequestOfferPriceSnapshot';
import { giftCardChargeInTransaction } from './giftCardCharge';
import { giftCardCreditInTransaction } from './giftCardCredit';
import { scheduleTestimonialReminderJobs } from './scheduleTestimonialReminderJobs';

function refundablePaymentIntentIds(paymentData: BookingRequestOfferPaymentData | null): string[] {
    if (!paymentData) return [];
    const ids: string[] = [];
    if ('amendmentPaymentIntentIds' in paymentData && paymentData.amendmentPaymentIntentIds) {
        for (let index = paymentData.amendmentPaymentIntentIds.length - 1; index >= 0; index -= 1) {
            const id = paymentData.amendmentPaymentIntentIds[index];
            if (id) ids.push(id);
        }
    }
    if ('paymentIntentId' in paymentData && paymentData.paymentIntentId) {
        ids.push(paymentData.paymentIntentId);
    }
    return [...new Set(ids)];
}

async function refundCustomerDelta(
    serverRuntime: ServerRuntime,
    paymentData: BookingRequestOfferPaymentData | null,
    amountCents: number,
    amendmentApplyId: string,
): Promise<{ refundIds: string[]; nextPaymentData: BookingRequestOfferPaymentData | null }> {
    if (amountCents <= 0) return { refundIds: [], nextPaymentData: paymentData };

    const paymentIntentIds = refundablePaymentIntentIds(paymentData);
    if (paymentIntentIds.length === 0) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: no refundable PaymentIntent for customer decrease');
    }

    let remaining = amountCents;
    const refundIds: string[] = [];
    for (let index = 0; index < paymentIntentIds.length && remaining > 0; index += 1) {
        const paymentIntentId = paymentIntentIds[index]!;
        const refundable = await serverRuntime.stripe.paymentIntentRefundableCentsFindOne(paymentIntentId);
        if (refundable <= 0) continue;
        const chunk = Math.min(remaining, refundable);
        const { refundId } = await serverRuntime.stripe.paymentIntentRefund(paymentIntentId, chunk, {
            idempotencyKey: `${amendmentApplyId}:refund:${index}`,
        });
        refundIds.push(refundId);
        remaining -= chunk;
    }

    if (remaining > 0) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: refundable PaymentIntent amount insufficient for customer decrease');
    }

    if (!paymentData) return { refundIds, nextPaymentData: paymentData };
    const existing = 'refundIds' in paymentData && paymentData.refundIds ? paymentData.refundIds : [];
    return {
        refundIds,
        nextPaymentData: { ...paymentData, refundIds: [...existing, ...refundIds] },
    };
}

function paymentDataWithAmendmentPaymentIntent(
    paymentData: BookingRequestOfferPaymentData | null,
    amendmentPaymentIntentId: string,
    extraTransferId?: string,
): BookingRequestOfferPaymentData | null {
    if (!paymentData) return paymentData;
    const amendmentPaymentIntentIds =
        'amendmentPaymentIntentIds' in paymentData && paymentData.amendmentPaymentIntentIds
            ? [...paymentData.amendmentPaymentIntentIds, amendmentPaymentIntentId]
            : [amendmentPaymentIntentId];
    const withAmendment: BookingRequestOfferPaymentData = {
        ...paymentData,
        amendmentPaymentIntentIds,
    };
    return extraTransferId ? paymentDataWithExtraTransfer(withAmendment, extraTransferId) : withAmendment;
}

async function amendmentClaim(serverRuntime: ServerRuntime, offerId: string, applyId: string): Promise<void> {
    const claimedAt = new Date().toISOString();
    const claimed = await serverRuntime.db
        .update(bookingRequestOffers)
        .set({
            participantAmendment: sql`jsonb_set(${bookingRequestOffers.participantAmendment}, '{claimedAt}', to_jsonb(${claimedAt}::text), true)`,
        })
        .where(
            and(
                eq(bookingRequestOffers.bookingRequestOfferId, offerId),
                sql`${bookingRequestOffers.participantAmendment}->>'amendmentApplyId' = ${applyId}`,
                sql`(${bookingRequestOffers.participantAmendment}->>'claimedAt') IS NULL`,
            ),
        )
        .returning({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId });

    if (claimed.length > 0) return;

    const [current] = await serverRuntime.db
        .select({ participantAmendment: bookingRequestOffers.participantAmendment })
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId))
        .limit(1);

    const amendment = current?.participantAmendment;
    if (amendment?.amendmentApplyId === applyId && amendment.claimedAt) {
        // Retry after a prior claim (Stripe ops are idempotent by applyId).
        return;
    }

    throw new Error('bookingRequestOfferParticipantAmendmentApply: amendment no longer pending (canceled or already applied)');
}

export type BookingRequestOfferParticipantAmendmentApplyResult = {
    customerDeltaCents: number;
    giftCardDeltaCents: number;
    paymentStatus: BookingRequestOffer['paymentStatus'];
    /** When set, customer must complete on-session checkout for a PAYED increase without reusable PM. */
    pendingDeltaPaymentDue: boolean;
};

/**
 * Apply a pending booking amendment: participants and/or venue, reprice, gift ledger, Stripe delta.
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
        giftCard?: GiftCard | null;
        promoCode?: PromoCode | null;
        travelDistanceKmAfter?: number | null;
        travelExpensesCentsAfter?: number;
        /** Timeline event for the apply (cook accept vs admin bypass). */
        acceptEventType?: 'COOK_PARTICIPANT_AMENDMENT_ACCEPTED' | 'ADMIN_PARTICIPANT_AMENDMENT_APPLIED';
    },
): Promise<BookingRequestOfferParticipantAmendmentApplyResult> {
    const { offer, bookingRequest, cook, customer, existingParticipants, amendment, giftCard = null, promoCode = null } = input;
    const acceptEventType = input.acceptEventType ?? 'COOK_PARTICIPANT_AMENDMENT_ACCEPTED';

    if (!cook.stripeAccountId) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: cook has no Stripe account');
    }
    if (!customer.emailAddress) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: customer has no email');
    }
    if (bookingRequestOfferHasPendingDeltaPayment(offer.paymentData)) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: unpaid pending delta payment must be completed first');
    }

    const applyId = amendment.amendmentApplyId || idCreate();
    await amendmentClaim(serverRuntime, offer.bookingRequestOfferId, applyId);

    const participantsAfter =
        amendment.participants ??
        existingParticipants.map((participant) => ({
            type: participant.type,
            name: participant.name,
            restrictions: participant.restrictions,
        }));
    const headcountChanged =
        amendment.participants != null &&
        (existingParticipants.filter((p) => p.type === 'ADULT').length !== participantsAfter.filter((p) => p.type === 'ADULT').length ||
            existingParticipants.filter((p) => p.type === 'DISCOUNTED').length !==
                participantsAfter.filter((p) => p.type === 'DISCOUNTED').length);

    const travelExpensesCentsAfter = amendment.travelExpensesCentsAfter ?? input.travelExpensesCentsAfter ?? offer.travelExpensesCents;
    const travelDistanceKmAfter = input.travelDistanceKmAfter ?? offer.travelDistanceKm ?? null;

    const totalCentsCustomerBefore = offer.totalCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer;
    const price = bookingRequestOfferParticipantAmendmentPriceCalculate(
        {
            menuPriceCentsBefore: offer.menuPriceCents,
            travelExpensesCentsAfter,
            totalWithoutDiscountsCentsCustomerBefore: offer.totalWithoutDiscountsCentsCustomer,
            totalCentsCustomerBefore,
            giftCardAppliedCentsBefore: offer.giftCardAppliedCents,
            giftCardBalanceCents: giftCard?.balanceCents ?? 0,
            promoAmountCents: promoCode?.amountCents ?? 0,
            participantsBefore: existingParticipants,
            participantsAfter,
            scaleMenuByParticipants: headcountChanged && amendment.menuPriceCentsAfter == null,
            menuPriceCentsOverride: amendment.menuPriceCentsAfter,
        },
        offer.payoutCentsCook,
    );

    if (price.giftCardDeltaCents !== 0 && !giftCard) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: gift card required for gift ledger delta');
    }

    const adultsBefore = existingParticipants.filter((p) => p.type === 'ADULT').length;
    const discountedBefore = existingParticipants.filter((p) => p.type === 'DISCOUNTED').length;
    const adultsAfter = participantsAfter.filter((p) => p.type === 'ADULT').length;
    const discountedAfter = participantsAfter.filter((p) => p.type === 'DISCOUNTED').length;

    const priceBeforeSnapshot = bookingRequestOfferPriceSnapshot(offer);
    const priceChanged =
        price.menuPriceCentsAfter !== offer.menuPriceCents ||
        price.travelExpensesCents !== offer.travelExpensesCents ||
        price.payoutCentsCookAfter !== offer.payoutCentsCook ||
        price.totalWithoutDiscountsCentsCustomerAfter !== offer.totalWithoutDiscountsCentsCustomer;

    let nextPaymentStatus = offer.paymentStatus;
    let nextPaymentData = offer.paymentData;
    let nextPlannedPaymentPullDateTime = offer.plannedPaymentPullDateTime;
    let nextPaymentDateTime = offer.paymentDateTime;
    let nextPlannedPayoutDateTime = offer.plannedPayoutDateTime;
    let pendingDeltaPaymentDue = false;

    if (offer.paymentStatus === 'EMPTY') {
        if (offer.paymentData && 'paymentIntentId' in offer.paymentData && offer.paymentData.paymentIntentId) {
            await serverRuntime.stripe.paymentIntentCancel(offer.paymentData.paymentIntentId);
        }
        if (offer.paymentData && 'setupIntentId' in offer.paymentData && offer.paymentData.setupIntentId) {
            await serverRuntime.stripe.setupIntentCancel(offer.paymentData.setupIntentId);
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
        nextPlannedPayoutDateTime = prepared.plannedPayoutDateTime;
    } else if (offer.paymentStatus === 'SETUP') {
        // Pull job reads updated columns; no Stripe money move yet.
    } else if (offer.paymentStatus === 'PAYED') {
        const customerDelta = price.customerDeltaCents;
        const cookDelta = price.cookPayoutDeltaCents;

        if (customerDelta < 0) {
            const refunded = await refundCustomerDelta(serverRuntime, nextPaymentData, Math.abs(customerDelta), applyId);
            nextPaymentData = refunded.nextPaymentData;
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

            const cookPayoutForSplit = Math.max(0, cookDelta);
            if (paymentMethodId) {
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
                    idempotencyKey: `${applyId}:charge`,
                });
                const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(paymentIntentId);
                if (!succeeded) {
                    throw new Error('bookingRequestOfferParticipantAmendmentApply: off-session delta payment intent not succeeded');
                }
                const extraTransferId = await bookingRequestOfferExtraTransferMaybeCreate(serverRuntime, {
                    destinationAccountId: cook.stripeAccountId,
                    userId: customer.userId,
                    totalCentsCustomer: customerDelta,
                    payoutCentsCook: cookPayoutForSplit,
                    idempotencyKey: `${applyId}:extra-transfer`,
                });
                nextPaymentData = paymentDataWithAmendmentPaymentIntent(nextPaymentData, paymentIntentId, extraTransferId);
            } else {
                const { paymentIntentId, clientSecret } = await serverRuntime.stripe.paymentIntentCreateWithSplit({
                    destinationAccountId: cook.stripeAccountId,
                    user: {
                        userId: customer.userId,
                        emailAddress: customer.emailAddress,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                    },
                    pullAmount: customerDelta,
                    payoutAmount: cookPayoutForSplit,
                    idempotencyKey: `${applyId}:charge-on-session`,
                });
                const priorAmendmentIds =
                    nextPaymentData && 'amendmentPaymentIntentIds' in nextPaymentData && nextPaymentData.amendmentPaymentIntentIds
                        ? nextPaymentData.amendmentPaymentIntentIds
                        : [];
                nextPaymentData = {
                    ...nextPaymentData,
                    clientSecret,
                    pendingDeltaPayment: {
                        paymentIntentId,
                        clientSecret,
                        amountCents: customerDelta,
                        cookPayoutDeltaCents: cookPayoutForSplit,
                    },
                    amendmentPaymentIntentIds: [...priorAmendmentIds, paymentIntentId],
                } as BookingRequestOfferPaymentData;
                pendingDeltaPaymentDue = true;
            }
        }

        if (cookDelta < 0) {
            const transferIds = await paymentTransferIdsForCookReverse(serverRuntime, offer.paymentData);
            await cookPayoutDeltaReverse(serverRuntime, transferIds, Math.abs(cookDelta), `${applyId}:transfer-reverse`);
        } else if (cookDelta > 0 && customerDelta <= 0) {
            const { transferId } = await serverRuntime.stripe.transferCreate({
                destinationAccountId: cook.stripeAccountId,
                payoutAmount: cookDelta,
                idempotencyKey: `${applyId}:transfer-create`,
            });
            if (nextPaymentData) {
                nextPaymentData = paymentDataWithExtraTransfer(nextPaymentData, transferId);
            }
        }
    } else {
        throw new Error(`bookingRequestOfferParticipantAmendmentApply: unsupported paymentStatus ${offer.paymentStatus}`);
    }

    const participantInserts = amendment.participants
        ? amendment.participants.map((participant) => ({
              bookingRequestParticipantId: idCreate(),
              bookingRequestId: bookingRequest.bookingRequestId,
              type: participant.type,
              name: participant.name,
              restrictions: participant.restrictions,
          }))
        : null;

    const nextAddress: BookingRequestExactEventAddress | null = amendment.exactEventAddress ?? null;
    const acceptEventId = idCreate();
    const systemPriceEventId = priceChanged ? idCreate() : null;
    const becamePayedFromEmpty = offer.paymentStatus === 'EMPTY' && nextPaymentStatus === 'PAYED';

    const applied = await serverRuntime.db.transaction(async (transaction) => {
        if (participantInserts != null) {
            await transaction
                .delete(bookingRequestParticipants)
                .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequest.bookingRequestId));
            await transaction.insert(bookingRequestParticipants).values(participantInserts);
        }

        if (nextAddress != null) {
            await transaction
                .update(bookingRequests)
                .set({ exactEventAddress: nextAddress })
                .where(eq(bookingRequests.bookingRequestId, bookingRequest.bookingRequestId));
        }

        if (giftCard && price.giftCardDeltaCents !== 0) {
            if (price.giftCardDeltaCents < 0) {
                await giftCardCreditInTransaction(transaction, giftCard, Math.abs(price.giftCardDeltaCents));
            } else {
                await giftCardChargeInTransaction(transaction, giftCard.giftCardId, price.giftCardDeltaCents);
            }
        }

        const updatedOffers = await transaction
            .update(bookingRequestOffers)
            .set({
                menuPriceCents: price.menuPriceCentsAfter,
                travelExpensesCents: price.travelExpensesCents,
                travelDistanceKm: travelDistanceKmAfter,
                paymentProviderFeeCents: price.paymentProviderFeeCents,
                platformFeePercentCook: price.platformFeePercentCook,
                platformFeePercentCustomer: price.platformFeePercentCustomer,
                platformFeeCentsCook: price.platformFeeCentsCook,
                platformFeeCentsCustomer: price.platformFeeCentsCustomer,
                payoutCentsCook: price.payoutCentsCookAfter,
                totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomerAfter,
                totalCentsCustomer: price.totalCentsCustomerAfter,
                giftCardAppliedCents: price.giftCardAppliedCentsAfter,
                paymentStatus: nextPaymentStatus,
                paymentData: nextPaymentData,
                plannedPaymentPullDateTime: nextPlannedPaymentPullDateTime,
                paymentDateTime: nextPaymentDateTime,
                plannedPayoutDateTime: nextPlannedPayoutDateTime,
                participantAmendment: null,
                userUnreadNotificationCount: offer.userUnreadNotificationCount + 1,
            })
            .where(
                and(
                    eq(bookingRequestOffers.bookingRequestOfferId, offer.bookingRequestOfferId),
                    sql`${bookingRequestOffers.participantAmendment}->>'amendmentApplyId' = ${applyId}`,
                ),
            )
            .returning({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId });

        if (updatedOffers.length === 0) {
            throw new Error(
                'bookingRequestOfferParticipantAmendmentApply: failed to persist after Stripe money move (amendment claim lost)',
            );
        }

        await transaction.insert(bookingRequestOfferEvents).values({
            bookingRequestOfferEventId: acceptEventId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
            type: acceptEventType,
            payload: {
                participantsAdultBefore: adultsBefore,
                participantsDiscountedBefore: discountedBefore,
                participantsAdultAfter: adultsAfter,
                participantsDiscountedAfter: discountedAfter,
                ...(nextAddress
                    ? {
                          locationBefore: bookingRequest.exactEventAddress,
                          locationAfter: nextAddress,
                      }
                    : {}),
                menuPriceCentsBefore: offer.menuPriceCents,
                menuPriceCentsAfter: price.menuPriceCentsAfter,
                travelExpensesCentsBefore: offer.travelExpensesCents,
                travelExpensesCentsAfter: price.travelExpensesCents,
                totalCentsCustomerBefore,
                totalCentsCustomerAfter: price.totalCentsCustomerAfter,
                payoutCentsCookBefore: offer.payoutCentsCook,
                payoutCentsCookAfter: price.payoutCentsCookAfter,
                customerDeltaCents: price.customerDeltaCents,
                cookPayoutDeltaCents: price.cookPayoutDeltaCents,
                giftCardDeltaCents: price.giftCardDeltaCents,
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

        return true;
    });

    if (!applied) {
        throw new Error('bookingRequestOfferParticipantAmendmentApply: transaction did not apply');
    }

    if (nextAddress != null) {
        await bookingRequestCookTravelDistanceKmClear(serverRuntime, {
            bookingRequestId: bookingRequest.bookingRequestId,
        });
    }

    if (becamePayedFromEmpty) {
        await scheduleTestimonialReminderJobs(serverRuntime, {
            bookingRequestOfferId: offer.bookingRequestOfferId,
            eventDate: bookingRequest.dateTime,
        });
        await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
            bookingRequestId: bookingRequest.bookingRequestId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
            eventDate: bookingRequest.dateTime,
        });
    }

    return {
        customerDeltaCents: price.customerDeltaCents,
        giftCardDeltaCents: price.giftCardDeltaCents,
        paymentStatus: nextPaymentStatus,
        pendingDeltaPaymentDue,
    };
}
