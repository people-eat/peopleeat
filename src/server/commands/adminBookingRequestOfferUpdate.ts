import { eq } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferPaymentStatus } from '../domain/bookingRequest';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';
import { bookingRequestOfferPriceSnapshot } from '../utils/bookingRequestOfferPriceSnapshot';

function assertNonNegativeInt(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`adminBookingRequestOfferUpdate: ${fieldName} must be a non-negative integer`);
    }
}

function assertPlatformFeePercent(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new Error(`adminBookingRequestOfferUpdate: ${fieldName} must be an integer from 0 to 100`);
    }
}

function offerPriceMoneyChanged(
    before: ReturnType<typeof bookingRequestOfferPriceSnapshot>,
    after: ReturnType<typeof bookingRequestOfferPriceSnapshot>,
): boolean {
    return (
        before.travelExpensesCents !== after.travelExpensesCents ||
        before.menuPriceCents !== after.menuPriceCents ||
        before.totalWithoutDiscountsCentsCustomer !== after.totalWithoutDiscountsCentsCustomer ||
        before.payoutCentsCook !== after.payoutCentsCook ||
        before.platformFeePercentCook !== after.platformFeePercentCook ||
        before.platformFeePercentCustomer !== after.platformFeePercentCustomer ||
        before.paymentProviderFeeCents !== after.paymentProviderFeeCents ||
        before.platformFeeCentsCook !== after.platformFeeCentsCook ||
        before.platformFeeCentsCustomer !== after.platformFeeCentsCustomer
    );
}

function dateTimeIsoOrNull(value: Date | null | undefined): string | null {
    if (value == null) return null;
    return value.toISOString();
}

export async function adminBookingRequestOfferUpdate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestOfferId = args.bookingRequestOfferId.trim();
    if (bookingRequestOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferUpdate: bookingRequestOfferId must not be empty');
    }

    const input = args.input;

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferUpdate: offer not found');
        }

        const { offer, bookingRequest } = row;
        const priceBefore = bookingRequestOfferPriceSnapshot(offer);

        const offerPatch: {
            userAccepted?: boolean | null;
            cookAccepted?: boolean | null;
            menuPriceCents?: number;
            travelExpensesCents?: number;
            paymentProviderFeeCents?: number;
            platformFeePercentCook?: number;
            platformFeePercentCustomer?: number;
            platformFeeCentsCook?: number;
            platformFeeCentsCustomer?: number;
            payoutCentsCook?: number;
            totalWithoutDiscountsCentsCustomer?: number;
            totalCentsCustomer?: number;
            travelDistanceKm?: number | null;
            paymentDateTime?: Date | null;
            plannedPayoutDateTime?: Date | null;
            payoutDateTime?: Date | null;
            paymentStatus?: BookingRequestOfferPaymentStatus;
        } = {};

        if (input.userAccepted !== undefined) {
            offerPatch.userAccepted = input.userAccepted;
        }
        if (input.cookAccepted !== undefined) {
            offerPatch.cookAccepted = input.cookAccepted;
        }

        const nextMenuPriceCents = input.menuPriceCents ?? offer.menuPriceCents;
        const nextTravelExpensesCents = input.travelExpensesCents ?? offer.travelExpensesCents;
        const nextPlatformFeePercentCook = input.platformFeePercentCook ?? offer.platformFeePercentCook;
        const nextPlatformFeePercentCustomer = input.platformFeePercentCustomer ?? offer.platformFeePercentCustomer;
        const priceInputsChanged =
            input.menuPriceCents != null ||
            input.travelExpensesCents != null ||
            input.platformFeePercentCook != null ||
            input.platformFeePercentCustomer != null;

        if (input.menuPriceCents != null) {
            assertNonNegativeInt(input.menuPriceCents, 'menuPriceCents');
            if (input.menuPriceCents <= 0) {
                throw new Error('adminBookingRequestOfferUpdate: menuPriceCents must be a positive integer');
            }
        }
        if (input.travelExpensesCents != null) {
            assertNonNegativeInt(input.travelExpensesCents, 'travelExpensesCents');
        }
        if (input.platformFeePercentCook != null) {
            assertPlatformFeePercent(input.platformFeePercentCook, 'platformFeePercentCook');
        }
        if (input.platformFeePercentCustomer != null) {
            assertPlatformFeePercent(input.platformFeePercentCustomer, 'platformFeePercentCustomer');
        }

        if (priceInputsChanged) {
            const dualAccepted = offer.userAccepted === true && offer.cookAccepted === true;
            if (
                dualAccepted ||
                offer.paymentStatus === 'SETUP' ||
                offer.paymentStatus === 'PAYED' ||
                offer.paymentStatus === 'TRANSFERRED' ||
                offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM'
            ) {
                throw new Error(
                    'adminBookingRequestOfferUpdate: cannot change menu/travel/fee prices on dual-accepted or paid offers; use bookingRequestOfferAmendmentCreate / Apply',
                );
            }

            const price = bookingRequestOfferPriceCalculate({
                menuPriceCents: nextMenuPriceCents,
                travelExpensesCents: nextTravelExpensesCents,
                platformFeePercentCook: nextPlatformFeePercentCook,
                platformFeePercentCustomer: nextPlatformFeePercentCustomer,
            });
            offerPatch.menuPriceCents = price.menuPriceCents;
            offerPatch.travelExpensesCents = price.travelExpensesCents;
            offerPatch.paymentProviderFeeCents = price.paymentProviderFeeCents;
            offerPatch.platformFeePercentCook = price.platformFeePercentCook;
            offerPatch.platformFeePercentCustomer = price.platformFeePercentCustomer;
            offerPatch.platformFeeCentsCook = price.platformFeeCentsCook;
            offerPatch.platformFeeCentsCustomer = price.platformFeeCentsCustomer;
            offerPatch.payoutCentsCook = price.payoutCentsCook;
            offerPatch.totalWithoutDiscountsCentsCustomer = price.totalWithoutDiscountsCentsCustomer;
            if (offer.totalCentsCustomer != null) {
                const discountCents = Math.max(0, offer.totalWithoutDiscountsCentsCustomer - offer.totalCentsCustomer);
                offerPatch.totalCentsCustomer = Math.max(0, price.totalWithoutDiscountsCentsCustomer - discountCents);
            }
        }

        if (input.travelDistanceKm !== undefined) {
            offerPatch.travelDistanceKm = input.travelDistanceKm;
        }
        if (input.paymentDateTime !== undefined) {
            offerPatch.paymentDateTime = input.paymentDateTime;
        }
        if (input.plannedPayoutDateTime !== undefined) {
            offerPatch.plannedPayoutDateTime = input.plannedPayoutDateTime;
        }
        if (input.payoutDateTime !== undefined) {
            offerPatch.payoutDateTime = input.payoutDateTime;
        }

        const nextUserAccepted = offerPatch.userAccepted !== undefined ? offerPatch.userAccepted : offer.userAccepted;
        const nextCookAccepted = offerPatch.cookAccepted !== undefined ? offerPatch.cookAccepted : offer.cookAccepted;
        const wasDualAccepted = offer.userAccepted === true && offer.cookAccepted === true;
        const becomingDualAccepted = nextUserAccepted === true && nextCookAccepted === true && !wasDualAccepted;
        let becamePaidOutOfSystem = false;
        if (becomingDualAccepted && offer.paymentStatus === 'EMPTY') {
            offerPatch.paymentStatus = 'PAYED_OUT_OF_SYSTEM';
            becamePaidOutOfSystem = true;
        }

        if (Object.keys(offerPatch).length === 0) {
            return { success: true, referenceId: bookingRequestOfferId };
        }

        const priceAfter = bookingRequestOfferPriceSnapshot({
            platformFeePercentCook: offerPatch.platformFeePercentCook ?? offer.platformFeePercentCook,
            platformFeePercentCustomer: offerPatch.platformFeePercentCustomer ?? offer.platformFeePercentCustomer,
            travelExpensesCents: offerPatch.travelExpensesCents ?? offer.travelExpensesCents,
            menuPriceCents: offerPatch.menuPriceCents ?? offer.menuPriceCents,
            paymentProviderFeeCents: offerPatch.paymentProviderFeeCents ?? offer.paymentProviderFeeCents,
            platformFeeCentsCook: offerPatch.platformFeeCentsCook ?? offer.platformFeeCentsCook,
            platformFeeCentsCustomer: offerPatch.platformFeeCentsCustomer ?? offer.platformFeeCentsCustomer,
            payoutCentsCook: offerPatch.payoutCentsCook ?? offer.payoutCentsCook,
            totalWithoutDiscountsCentsCustomer: offerPatch.totalWithoutDiscountsCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer,
        });

        const acceptanceChanged =
            (offerPatch.userAccepted !== undefined && offerPatch.userAccepted !== offer.userAccepted) ||
            (offerPatch.cookAccepted !== undefined && offerPatch.cookAccepted !== offer.cookAccepted);

        const nextPaymentStatus = offerPatch.paymentStatus ?? offer.paymentStatus;
        const nextPaymentDateTime = offerPatch.paymentDateTime !== undefined ? offerPatch.paymentDateTime : offer.paymentDateTime;
        const nextPlannedPayoutDateTime =
            offerPatch.plannedPayoutDateTime !== undefined ? offerPatch.plannedPayoutDateTime : offer.plannedPayoutDateTime;
        const nextPayoutDateTime = offerPatch.payoutDateTime !== undefined ? offerPatch.payoutDateTime : offer.payoutDateTime;
        const paymentScheduleChanged =
            nextPaymentStatus !== offer.paymentStatus ||
            dateTimeIsoOrNull(nextPaymentDateTime) !== dateTimeIsoOrNull(offer.paymentDateTime) ||
            dateTimeIsoOrNull(nextPlannedPayoutDateTime) !== dateTimeIsoOrNull(offer.plannedPayoutDateTime) ||
            dateTimeIsoOrNull(nextPayoutDateTime) !== dateTimeIsoOrNull(offer.payoutDateTime);

        const eventInserts: Array<{
            bookingRequestOfferEventId: string;
            bookingRequestOfferId: string;
            type: 'ADMIN_CHANGED_PRICE' | 'ADMIN_ACCEPTANCE_UPDATED' | 'ADMIN_PAYMENT_SCHEDULE_UPDATED' | 'ADMIN_PAYED_OUT_OF_SYSTEM';
            payload: Record<string, unknown>;
        }> = [];

        if (offerPriceMoneyChanged(priceBefore, priceAfter)) {
            eventInserts.push({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'ADMIN_CHANGED_PRICE',
                payload: { priceBefore, priceAfter },
            });
        }

        if (acceptanceChanged) {
            eventInserts.push({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'ADMIN_ACCEPTANCE_UPDATED',
                payload: {
                    userAcceptedBefore: offer.userAccepted,
                    userAcceptedAfter: nextUserAccepted,
                    cookAcceptedBefore: offer.cookAccepted,
                    cookAcceptedAfter: nextCookAccepted,
                },
            });
        }

        if (paymentScheduleChanged) {
            eventInserts.push({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'ADMIN_PAYMENT_SCHEDULE_UPDATED',
                payload: {
                    paymentStatusBefore: offer.paymentStatus,
                    paymentStatusAfter: nextPaymentStatus,
                    paymentDateTimeBefore: dateTimeIsoOrNull(offer.paymentDateTime),
                    paymentDateTimeAfter: dateTimeIsoOrNull(nextPaymentDateTime),
                    plannedPayoutDateTimeBefore: dateTimeIsoOrNull(offer.plannedPayoutDateTime),
                    plannedPayoutDateTimeAfter: dateTimeIsoOrNull(nextPlannedPayoutDateTime),
                    payoutDateTimeBefore: dateTimeIsoOrNull(offer.payoutDateTime),
                    payoutDateTimeAfter: dateTimeIsoOrNull(nextPayoutDateTime),
                },
            });
        }

        if (becamePaidOutOfSystem) {
            eventInserts.push({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'ADMIN_PAYED_OUT_OF_SYSTEM',
                payload: {
                    amountCents: offerPatch.payoutCentsCook ?? offer.payoutCentsCook,
                    source: 'ADMIN_DUAL_ACCEPT',
                },
            });
        }

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set(offerPatch)
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            if (eventInserts.length > 0) {
                await transaction.insert(bookingRequestOfferEvents).values(
                    eventInserts.map((event) => ({
                        bookingRequestOfferEventId: event.bookingRequestOfferEventId,
                        bookingRequestOfferId: event.bookingRequestOfferId,
                        type: event.type,
                        payload: event.payload as never,
                    })),
                );
            }
        });

        if (becamePaidOutOfSystem || (offerPatch.paymentStatus != null && bookingRequestOfferPaymentIsPaid(offerPatch.paymentStatus))) {
            await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                bookingRequestId: bookingRequest.bookingRequestId,
                bookingRequestOfferId,
                eventDate: bookingRequest.dateTime,
            });
        }

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
