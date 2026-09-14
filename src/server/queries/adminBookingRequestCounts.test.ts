import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequests } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestCounts } from './adminBookingRequestCounts';

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

describe('adminBookingRequestCounts', () => {
    it('returns one count per criterion in order', async () => {
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Count',
            emailAddress: `count-${idCreate().slice(0, 8)}@example.com`,
        });
        const token = `br-facet-${idCreate().slice(0, 8)}`;

        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
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

        const [byOccasion, byEmail] = await adminBookingRequestCounts(
            {
                criteria: [{ searchText: token }, { searchText: user.emailAddress }],
            },
            requestingSession,
            serverRuntime,
        );

        expect(byOccasion).toBe(1);
        expect(byEmail).toBe(2);
    });

    it('counts rows matching searchText on occasion and customer email', async () => {
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Count',
            emailAddress: `count-${idCreate().slice(0, 8)}@example.com`,
        });
        const token = `br-count-${idCreate().slice(0, 8)}`;

        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
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

        const [byOccasion] = await adminBookingRequestCounts({ criteria: [{ searchText: token }] }, requestingSession, serverRuntime);
        expect(byOccasion).toBe(1);

        const [byEmail] = await adminBookingRequestCounts(
            { criteria: [{ searchText: user.emailAddress }] },
            requestingSession,
            serverRuntime,
        );
        expect(byEmail).toBe(2);

        const [none] = await adminBookingRequestCounts(
            { criteria: [{ searchText: `missing-${idCreate()}` }] },
            requestingSession,
            serverRuntime,
        );
        expect(none).toBe(0);
    });

    it('counts rows matching userIds', async () => {
        const customerA = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Scope',
            emailAddress: `scope-a-${idCreate().slice(0, 8)}@example.com`,
        });
        const customerB = await commandSetup.withUser({
            firstName: 'Bob',
            lastName: 'Scope',
            emailAddress: `scope-b-${idCreate().slice(0, 8)}@example.com`,
        });

        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
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
            userId: customerA.user.userId,
            occasion: 'Dinner A2',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Second request',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId: idCreate(),
            userId: customerB.user.userId,
            occasion: 'Dinner B',
            dateTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Other customer',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        const [forA, forB] = await adminBookingRequestCounts(
            {
                criteria: [{ userIds: [customerA.user.userId] }, { userIds: [customerB.user.userId] }],
            },
            customerA.requestingSession,
            customerA.serverRuntime,
        );

        expect(forA).toBe(2);
        expect(forB).toBe(1);
    });

    it('rejects an empty criteria list', async () => {
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        await expect(adminBookingRequestCounts({ criteria: [] }, requestingSession, serverRuntime)).rejects.toThrow(
            /criteria must not be empty/,
        );
    });
});
