import { and, eq, inArray } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookOfferAddons, cooks, promoCodes, users } from '../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferAddonSelectionUpdateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferAddonReprice } from '../utils/bookingRequestOfferAddonReprice';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';
import { bookingRequestOfferPaymentPdfsCreate } from '../utils/bookingRequestOfferPaymentPdfsCreate';
import { bookingRequestOfferPaymentPrepare } from '../utils/bookingRequestOfferPaymentPrepare';
import { bookingRequestOfferPriceSnapshot } from '../utils/bookingRequestOfferPriceSnapshot';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { scheduleTestimonialReminderJobs } from '../utils/scheduleTestimonialReminderJobs';

export async function userBookingRequestOfferAddonSelectionUpdate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferAddonSelectionUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, requestingSession, serverRuntime);

    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, userId))) {
        throw new Error('userBookingRequestOfferAddonSelectionUpdate: feature disabled');
    }

    try {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
                cook: cooks,
                customer: users,
                promoCode: promoCodes,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .leftJoin(promoCodes, eq(promoCodes.promoCodeId, bookingRequests.promoCodeId))
            .where(and(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId), eq(bookingRequests.userId, userId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: offer not found');
        }

        if (row.offer.userAccepted === false || row.offer.cookAccepted === false) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: offer already declined');
        }

        if (row.offer.paymentStatus !== 'EMPTY') {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: offer already paid');
        }

        const dualAccepted = row.offer.userAccepted === true && row.offer.cookAccepted === true;

        const selections = args.selections;
        if (selections.length === 0) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: selections required');
        }

        const addonIds = selections.map((selection) => selection.cookOfferAddonId);
        const uniqueIds = [...new Set(addonIds)];
        if (uniqueIds.length !== addonIds.length) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: duplicate cookOfferAddonId');
        }

        const offerAddons = await serverRuntime.db
            .select()
            .from(cookOfferAddons)
            .where(
                and(
                    eq(cookOfferAddons.bookingRequestOfferId, args.bookingRequestOfferId),
                    inArray(cookOfferAddons.cookOfferAddonId, uniqueIds),
                ),
            );
        if (offerAddons.length !== uniqueIds.length) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: one or more addons not on offer');
        }

        const selectedTitlesBefore = offerAddons.filter((addon) => addon.customerSelected).map((addon) => addon.title);
        const priceBefore = bookingRequestOfferPriceSnapshot(row.offer);
        const selectionById = new Map(selections.map((selection) => [selection.cookOfferAddonId, selection.selected]));

        let totalCentsCustomerAfter = row.offer.totalCentsCustomer;
        let payoutCentsCookAfter = row.offer.payoutCentsCook;

        await serverRuntime.db.transaction(async (transaction) => {
            for (const addon of offerAddons) {
                const selected = selectionById.get(addon.cookOfferAddonId);
                if (selected === undefined) {
                    continue;
                }
                if (addon.inclusion === 'REQUIRED' && !selected) {
                    throw new Error('userBookingRequestOfferAddonSelectionUpdate: required addon cannot be unselected');
                }
                await transaction
                    .update(cookOfferAddons)
                    .set({ customerSelected: selected, updatedAt: new Date() })
                    .where(eq(cookOfferAddons.cookOfferAddonId, addon.cookOfferAddonId));
            }

            const reprice = await bookingRequestOfferAddonReprice(transaction, row.offer);
            const selectedTitlesAfter = reprice.addonRows.filter((addon) => addon.customerSelected).map((addon) => addon.title);
            payoutCentsCookAfter = reprice.priceAfter.payoutCentsCook;

            if (dualAccepted) {
                const promoAmountCents = row.promoCode?.amountCents ?? 0;
                totalCentsCustomerAfter = Math.max(
                    0,
                    reprice.priceAfter.totalWithoutDiscountsCentsCustomer - row.offer.giftCardAppliedCents - promoAmountCents,
                );
                await transaction
                    .update(bookingRequestOffers)
                    .set({ totalCentsCustomer: totalCentsCustomerAfter })
                    .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId));
            }

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: args.bookingRequestOfferId,
                type: 'USER_CHANGED_ADDON_SELECTION',
                payload: {
                    priceBefore,
                    priceAfter: bookingRequestOfferPriceSnapshot({
                        ...row.offer,
                        ...reprice.priceAfter,
                    }),
                    selectedTitlesBefore,
                    selectedTitlesAfter,
                },
            });
        });

        if (dualAccepted) {
            if (!row.customer.emailAddress) {
                throw new Error('userBookingRequestOfferAddonSelectionUpdate: customer email required');
            }
            if (!row.cook.stripeAccountId) {
                throw new Error('userBookingRequestOfferAddonSelectionUpdate: cook stripe account required');
            }

            const paymentData = row.offer.paymentData;
            const paymentIntentId = paymentData != null && 'paymentIntentId' in paymentData ? paymentData.paymentIntentId : undefined;
            const setupIntentId = paymentData != null && 'setupIntentId' in paymentData ? paymentData.setupIntentId : undefined;
            const mustRefreshPayment =
                paymentIntentId != null || (setupIntentId != null && totalCentsCustomerAfter === 0) || paymentData == null;

            if (mustRefreshPayment) {
                if (paymentIntentId != null) {
                    await serverRuntime.stripe.paymentIntentCancel(paymentIntentId);
                }
                if (setupIntentId != null) {
                    await serverRuntime.stripe.setupIntentCancel(setupIntentId);
                }

                const prepared = await bookingRequestOfferPaymentPrepare(serverRuntime, {
                    userId,
                    emailAddress: row.customer.emailAddress,
                    firstName: row.customer.firstName,
                    lastName: row.customer.lastName,
                    destinationAccountId: row.cook.stripeAccountId,
                    totalCentsCustomer: totalCentsCustomerAfter ?? 0,
                    payoutCentsCook: payoutCentsCookAfter,
                    eventDateTime: row.bookingRequest.dateTime,
                });

                await serverRuntime.db
                    .update(bookingRequestOffers)
                    .set({
                        paymentStatus: prepared.paymentStatus,
                        paymentData: prepared.paymentData,
                        plannedPaymentPullDateTime: prepared.plannedPaymentPullDateTime,
                        paymentDateTime: prepared.paymentDateTime,
                        plannedPayoutDateTime: prepared.plannedPayoutDateTime,
                    })
                    .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId));

                if (prepared.paymentStatus === 'PAYED') {
                    await serverRuntime.db.insert(bookingRequestOfferEvents).values({
                        bookingRequestOfferEventId: idCreate(),
                        bookingRequestOfferId: args.bookingRequestOfferId,
                        type: 'SYSTEM_PAYMENT_SUCCEEDED',
                        payload: { amountCents: totalCentsCustomerAfter ?? 0, source: 'AMENDMENT' },
                    });

                    if (bookingRequestOfferPaymentIsPaid(prepared.paymentStatus)) {
                        await bookingRequestOfferPaymentPdfsCreate(args.bookingRequestOfferId, serverRuntime);
                    }

                    await scheduleTestimonialReminderJobs(serverRuntime, {
                        bookingRequestOfferId: args.bookingRequestOfferId,
                        eventDate: row.bookingRequest.dateTime,
                    });
                    await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                        bookingRequestId: row.bookingRequest.bookingRequestId,
                        bookingRequestOfferId: args.bookingRequestOfferId,
                        eventDate: row.bookingRequest.dateTime,
                    });
                }
            }
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.userUpdates({ userId: row.offer.cookId })]);

        return { success: true, referenceId: args.bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
