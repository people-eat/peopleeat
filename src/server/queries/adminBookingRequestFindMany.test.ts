import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestFindMany } from './adminBookingRequestFindMany';

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

describe('adminBookingRequestFindMany', () => {
    it('filters by userIds', async () => {
        // Arrange
        const customerA = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Find',
            emailAddress: `find-a-${idCreate().slice(0, 8)}@example.com`,
        });
        const customerB = await commandSetup.withUser({
            firstName: 'Bob',
            lastName: 'Find',
            emailAddress: `find-b-${idCreate().slice(0, 8)}@example.com`,
        });
        const matchId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: matchId,
            userId: customerA.user.userId,
            occasion: 'Dinner A',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
            userId: customerB.user.userId,
            occasion: 'Dinner B',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Other customer',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            { criterion: { skip: 0, take: 100, userIds: [customerA.user.userId] } },
            customerA.requestingSession,
            customerA.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([matchId]);
    });

    it('treats empty userIds as no user filter', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Empty',
            emailAddress: `empty-${idCreate().slice(0, 8)}@example.com`,
        });
        const token = `br-empty-${idCreate().slice(0, 8)}`;
        const matchId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: matchId,
            userId: user.userId,
            occasion: token,
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, userIds: [] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([matchId]);
    });

    it('filters by bookingRequestIds', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'ById',
            emailAddress: `by-id-${idCreate().slice(0, 8)}@example.com`,
        });
        const token = `br-ids-${idCreate().slice(0, 8)}`;
        const matchId = idCreate();
        const otherId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: matchId,
            userId: user.userId,
            occasion: `${token}-match`,
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId: otherId,
            userId: user.userId,
            occasion: `${token}-other`,
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Other request',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        // Act
        const byId = await adminBookingRequestFindMany(
            { criterion: { skip: 0, take: 100, bookingRequestIds: [matchId] } },
            requestingSession,
            serverRuntime,
        );
        const unknown = await adminBookingRequestFindMany(
            { criterion: { skip: 0, take: 100, bookingRequestIds: [idCreate()] } },
            requestingSession,
            serverRuntime,
        );
        const emptyIds = await adminBookingRequestFindMany(
            { criterion: { skip: 0, take: 100, bookingRequestIds: [], searchText: token } },
            requestingSession,
            serverRuntime,
        );
        const andSearch = await adminBookingRequestFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    bookingRequestIds: [matchId, otherId],
                    searchText: `${token}-match`,
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(byId.map((row) => row.bookingRequestId)).toEqual([matchId]);
        expect(unknown).toEqual([]);
        expect(emptyIds.map((row) => row.bookingRequestId).sort()).toEqual([matchId, otherId].sort());
        expect(andSearch.map((row) => row.bookingRequestId)).toEqual([matchId]);
    });

    it('filters by searchText', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Search',
            emailAddress: `search-${idCreate().slice(0, 8)}@example.com`,
        });
        const token = `br-find-${idCreate().slice(0, 8)}`;
        const matchId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: matchId,
            userId: user.userId,
            occasion: token,
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
            userId: user.userId,
            occasion: 'Other dinner',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Different message',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            { criterion: { skip: 0, take: 100, searchText: token } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([matchId]);
    });

    it('respects skip and take', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Page',
            emailAddress: `page-${idCreate().slice(0, 8)}@example.com`,
        });
        const token = `br-page-${idCreate().slice(0, 8)}`;
        const ids = [idCreate(), idCreate(), idCreate()];
        for (const [index, bookingRequestId] of ids.entries()) {
            await testDb.insert(bookingRequests).values({
                bookingRequestId,
                userId: user.userId,
                occasion: `${token}-${index}`,
                dateTime: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
                exactEventAddress: berlin,
                originalMessage: 'Page test',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
                createdAt: new Date(Date.now() - index * 60_000),
            });
        }

        // Act
        const page = await adminBookingRequestFindMany(
            { criterion: { skip: 1, take: 1, searchText: token } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(page).toHaveLength(1);
        expect(page[0]?.bookingRequestId).toBe(ids[1]);
    });

    it('filters by publicationStatuses', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Pub',
            emailAddress: `pub-${idCreate().slice(0, 8)}@example.com`,
        });
        const blockedId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: blockedId,
            userId: user.userId,
            occasion: 'Large dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Twelve participants',
            publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
            preferences: [],
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
            userId: user.userId,
            occasion: 'Small dinner',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Four participants',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    userIds: [user.userId],
                    publicationStatuses: ['PUBLICATION_BLOCKED_BY_ADMIN_REVIEW'],
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([blockedId]);
    });

    it('treats empty publicationStatuses as no publication filter', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'PubEmpty',
            emailAddress: `pub-empty-${idCreate().slice(0, 8)}@example.com`,
        });
        const token = `br-pub-empty-${idCreate().slice(0, 8)}`;
        const matchId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: matchId,
            userId: user.userId,
            occasion: token,
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, publicationStatuses: [] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([matchId]);
    });

    it('filters by statuses (canceled)', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Status',
            emailAddress: `status-${idCreate().slice(0, 8)}@example.com`,
        });
        const canceledId = idCreate();
        const openId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: canceledId,
            userId: user.userId,
            occasion: 'Canceled dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Canceled',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
            canceledAt: new Date(),
            cancellationReason: 'Changed plans',
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId: openId,
            userId: user.userId,
            occasion: 'Open dinner',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Open',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    userIds: [user.userId],
                    statuses: ['CANCELED'],
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([canceledId]);
        expect(rows[0]?.status).toBe('CANCELED');
    });

    it('filters by statuses (waiting for offers)', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Waiting',
            emailAddress: `waiting-${idCreate().slice(0, 8)}@example.com`,
        });
        const waitingId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: waitingId,
            userId: user.userId,
            occasion: 'Waiting dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Waiting',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
            userId: user.userId,
            occasion: 'Canceled dinner',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Canceled',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
            canceledAt: new Date(),
            cancellationReason: 'Changed plans',
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    userIds: [user.userId],
                    statuses: ['WAITING_FOR_OFFERS'],
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([waitingId]);
        expect(rows[0]?.status).toBe('WAITING_FOR_OFFERS');
    });

    it('treats empty statuses as no status filter', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'StatusEmpty',
            emailAddress: `status-empty-${idCreate().slice(0, 8)}@example.com`,
        });
        const token = `br-status-empty-${idCreate().slice(0, 8)}`;
        const matchId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: matchId,
            userId: user.userId,
            occasion: token,
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, statuses: [] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([matchId]);
    });

    it('filters by createdAtFrom / createdAtTo', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'CreatedAt',
            emailAddress: `created-at-${idCreate().slice(0, 8)}@example.com`,
        });
        const recentId = idCreate();
        const oldId = idCreate();
        const now = Date.now();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: recentId,
            userId: user.userId,
            occasion: 'Recent dinner',
            dateTime: new Date(now + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Recent',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
            createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId: oldId,
            userId: user.userId,
            occasion: 'Old dinner',
            dateTime: new Date(now + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Old',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
            createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
        });

        // Act
        const rows = await adminBookingRequestFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    userIds: [user.userId],
                    createdAtFrom: new Date(now - 7 * 24 * 60 * 60 * 1000),
                    createdAtTo: new Date(now),
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.bookingRequestId)).toEqual([recentId]);
        expect(rows.map((row) => row.bookingRequestId)).not.toContain(oldId);
    });

    it('filters by cookIds with notifiedOnly', async () => {
        // Arrange
        const customer = await commandSetup.withUser({
            firstName: 'Customer',
            lastName: 'Pool',
            emailAddress: `pool-c-${idCreate().slice(0, 8)}@example.com`,
        });
        const cook = await commandSetup.withUser({
            firstName: 'Cook',
            lastName: 'Pool',
            emailAddress: `pool-k-${idCreate().slice(0, 8)}@example.com`,
        });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const notifiedId = idCreate();
        const pendingNotifyId = idCreate();
        await testDb.insert(bookingRequests).values([
            {
                bookingRequestId: notifiedId,
                userId: customer.user.userId,
                occasion: 'Notified dinner',
                dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                exactEventAddress: berlin,
                originalMessage: 'Notified',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
            },
            {
                bookingRequestId: pendingNotifyId,
                userId: customer.user.userId,
                occasion: 'Pending notify dinner',
                dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                exactEventAddress: berlin,
                originalMessage: 'Pending notify',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
            },
        ]);
        await testDb.insert(bookingRequestCooks).values([
            { cookId: cook.user.userId, bookingRequestId: notifiedId, notifiedAt: new Date() },
            { cookId: cook.user.userId, bookingRequestId: pendingNotifyId, notifiedAt: null },
        ]);

        // Act
        const notifiedOnly = await adminBookingRequestFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    cookIds: [cook.user.userId],
                    notifiedOnly: true,
                },
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const allPool = await adminBookingRequestFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    cookIds: [cook.user.userId],
                    notifiedOnly: false,
                },
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(notifiedOnly.map((row) => row.bookingRequestId)).toEqual([notifiedId]);
        expect(allPool.map((row) => row.bookingRequestId).sort()).toEqual([notifiedId, pendingNotifyId].sort());
    });
});
