import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, supportRequests } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminActionItemsSnapshot } from './adminActionItemsSnapshot';

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

describe('adminActionItemsSnapshot', () => {
    it('returns empty queues when nothing matches', async () => {
        const { serverRuntime } = await commandSetup();
        const token = idCreate();

        const snapshot = await adminActionItemsSnapshot(serverRuntime, {
            now: new Date(),
            take: 5,
        });

        // Shared test DB may contain leftovers; assert structure and that our
        // unique token is not present rather than absolute zeros.
        expect(snapshot.pendingCooks.items.every((item) => !(item.emailAddress ?? '').includes(token))).toBe(true);
        expect(snapshot.blockedBookingRequests.items.every((item) => !item.occasion.includes(token))).toBe(true);
        expect(snapshot.openSupportRequests.items.every((item) => !item.subject.includes(token))).toBe(true);
        expect(typeof snapshot.pendingCooks.count).toBe('number');
        expect(typeof snapshot.blockedBookingRequests.count).toBe('number');
        expect(typeof snapshot.duePayoutOffers.count).toBe('number');
        expect(typeof snapshot.openSupportRequests.count).toBe('number');
        expect(typeof snapshot.pendingOfferChatReviews.count).toBe('number');
    });

    it('includes pending cooks, blocked bookings, due payouts, open support, and offer-chat reviews', async () => {
        const { serverRuntime } = await commandSetup();
        const token = idCreate().slice(0, 8);

        const pendingCook = await commandSetup.withUser({
            firstName: `Pending-${token}`,
            lastName: 'Cook',
        });
        await testDb.insert(cooks).values({
            cookId: pendingCook.user.userId,
            isApprovedByAdmin: false,
            isVisible: false,
        });

        const approvedCook = await commandSetup.withUser({
            firstName: `Approved-${token}`,
            lastName: 'Cook',
        });
        await testDb.insert(cooks).values({
            cookId: approvedCook.user.userId,
            isApprovedByAdmin: true,
            isVisible: true,
            stripeAccountId: `acct_${token}`,
            stripeAccountActive: true,
            exactTravelOriginAddress: berlin,
            travelExpensesAmount: 25,
            maximumTravelDistance: 100,
        });

        const customer = await commandSetup.withUser({
            firstName: `Customer-${token}`,
            lastName: 'Host',
        });

        const blockedBookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: blockedBookingRequestId,
            userId: customer.user.userId,
            occasion: `Blocked-${token}`,
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
            preferences: [],
        });

        const autoApprovedBookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: autoApprovedBookingRequestId,
            userId: customer.user.userId,
            occasion: `Auto-${token}`,
            dateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        const dueOfferId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: dueOfferId,
            bookingRequestId: autoApprovedBookingRequestId,
            cookId: approvedCook.user.userId,
            cookAccepted: true,
            userAccepted: true,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_000,
            totalCentsCustomer: 23_000,
            paymentStatus: 'PAYED',
            paymentDateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            // Unique far-past so ASC plannedPayoutDateTime surfaces this row first in shared DB tests
            // (many leftover fixtures share 1970-01-01 / 2020-01-01 and crowd out take:5).
            plannedPayoutDateTime: new Date('1900-01-01T00:00:00.000Z'),
        });

        const futureBookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: futureBookingRequestId,
            userId: customer.user.userId,
            occasion: `FuturePay-${token}`,
            dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        const futureOfferId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: futureOfferId,
            bookingRequestId: futureBookingRequestId,
            cookId: approvedCook.user.userId,
            cookAccepted: true,
            userAccepted: true,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_000,
            totalCentsCustomer: 23_000,
            paymentStatus: 'PAYED',
            paymentDateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            plannedPayoutDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const openSupportRequestId = idCreate();
        await testDb.insert(supportRequests).values({
            supportRequestId: openSupportRequestId,
            userId: customer.user.userId,
            subject: `Open-${token}`,
            status: 'OPEN',
            adminUnreadNotificationCount: 2,
        });

        const resolvedSupportRequestId = idCreate();
        await testDb.insert(supportRequests).values({
            supportRequestId: resolvedSupportRequestId,
            userId: customer.user.userId,
            subject: `Resolved-${token}`,
            status: 'RESOLVED',
            resolvedAt: new Date(),
        });

        vi.mocked(serverRuntime.stripe.accountPayoutsEnabledCheck).mockResolvedValue(true);

        const snapshot = await adminActionItemsSnapshot(serverRuntime, { now: new Date(), take: 100 });

        expect(snapshot.pendingCooks.items.some((item) => item.userId === pendingCook.user.userId)).toBe(true);
        expect(snapshot.pendingCooks.items.some((item) => item.userId === approvedCook.user.userId)).toBe(false);

        expect(snapshot.blockedBookingRequests.items.some((item) => item.bookingRequestId === blockedBookingRequestId)).toBe(true);
        expect(snapshot.blockedBookingRequests.items.some((item) => item.occasion === `Auto-${token}`)).toBe(false);

        expect(snapshot.duePayoutOffers.items.some((item) => item.bookingRequestOfferId === dueOfferId)).toBe(true);
        expect(snapshot.duePayoutOffers.items.some((item) => item.bookingRequestOfferId === futureOfferId)).toBe(false);
        const dueItem = snapshot.duePayoutOffers.items.find((item) => item.bookingRequestOfferId === dueOfferId);
        expect(dueItem?.cookPayoutReady).toBe(true);

        expect(snapshot.openSupportRequests.items.some((item) => item.supportRequestId === openSupportRequestId)).toBe(true);
        expect(snapshot.openSupportRequests.items.some((item) => item.supportRequestId === resolvedSupportRequestId)).toBe(false);

        await testDb
            .update(bookingRequestOffers)
            .set({ adminChatReviewPendingCount: 3 })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, dueOfferId));

        const withChatReview = await adminActionItemsSnapshot(serverRuntime, { now: new Date(), take: 100 });
        expect(withChatReview.pendingOfferChatReviews.items.some((item) => item.bookingRequestOfferId === dueOfferId)).toBe(true);
        expect(
            withChatReview.pendingOfferChatReviews.items.find((item) => item.bookingRequestOfferId === dueOfferId)
                ?.adminChatReviewPendingCount,
        ).toBe(3);
    });

    it('caps listed items at take while reporting full count', async () => {
        const { serverRuntime } = await commandSetup();
        const token = idCreate().slice(0, 8);
        const customer = await commandSetup.withUser({ firstName: `Cap-${token}`, lastName: 'User' });

        for (let index = 0; index < 7; index += 1) {
            await testDb.insert(supportRequests).values({
                supportRequestId: idCreate(),
                userId: customer.user.userId,
                subject: `Cap-${token}-${index}`,
                status: 'OPEN',
            });
        }

        const snapshot = await adminActionItemsSnapshot(serverRuntime, { now: new Date(), take: 5 });
        const matching = snapshot.openSupportRequests.items.filter((item) => item.subject.startsWith(`Cap-${token}`));
        expect(matching.length).toBeLessThanOrEqual(5);
        expect(snapshot.openSupportRequests.count).toBeGreaterThanOrEqual(7);
    });
});
