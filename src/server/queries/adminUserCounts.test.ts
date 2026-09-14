import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, users } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminUserCounts } from './adminUserCounts';
import { adminUserRegistrationsFindMany } from './adminUserRegistrationsFindMany';

const allTypes = ['customer', 'cook', 'admin'] as const;

describe('adminUserCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'counts-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cook = await commandSetup.withUser({ firstName: 'counts-cook', lastName: 'User' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        await commandSetup.withUser({ firstName: 'counts-customer', lastName: 'User' });

        // Act
        const [total, customer, cookCount, adminCount] = await adminUserCounts(
            {
                criteria: [{ types: [...allTypes] }, { types: ['customer'] }, { types: ['cook'] }, { types: ['admin'] }],
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert — seeded rows from other tests exist; assert our labels via lower bounds
        expect(total).toBeGreaterThanOrEqual(3);
        expect(adminCount).toBeGreaterThanOrEqual(1);
        expect(cookCount).toBeGreaterThanOrEqual(1);
        expect(customer).toBeGreaterThanOrEqual(2);
    });

    it('counts rows matching searchText', async () => {
        // Arrange
        const nameToken = `count-name-${idCreate().slice(0, 8)}`;
        const emailToken = `count-email-${idCreate().slice(0, 8)}`;
        const admin = await commandSetup.withUser({ firstName: `${nameToken}-admin`, lastName: 'User' });
        await commandSetup.withUser({ firstName: `${nameToken}-one`, lastName: 'User' });
        await commandSetup.withUser({ firstName: `${nameToken}-two`, lastName: 'User' });
        await testDb.insert(users).values({
            userId: idCreate(),
            emailAddress: `${emailToken}@example.com`,
            firstName: 'unrelated-name',
            lastName: 'User',
        });

        // Act
        const [byName] = await adminUserCounts(
            { criteria: [{ searchText: nameToken, types: [...allTypes] }] },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const [byEmail] = await adminUserCounts(
            { criteria: [{ searchText: emailToken, types: [...allTypes] }] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(byName).toBe(3);
        expect(byEmail).toBe(1);
    });

    it('returns 0 when types is empty', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'count-empty-types', lastName: 'User' });

        // Act
        const [total] = await adminUserCounts({ criteria: [{ types: [] }] }, admin.requestingSession, admin.serverRuntime);

        // Assert
        expect(total).toBe(0);
    });
});

describe('adminUserRegistrationsFindMany', () => {
    it('returns a zero-filled day series for the requested range', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'registrations-admin', lastName: 'User' });
        const startDateTime = new Date(Date.UTC(2026, 7, 1));
        const endDateTime = new Date(Date.UTC(2026, 7, 10));

        // Act
        const series = await adminUserRegistrationsFindMany(
            { range: { startDateTime, endDateTime }, granularity: 'day' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(series).toHaveLength(10);
        expect(series.every((bucket) => bucket.count >= 0)).toBe(true);
        for (let i = 1; i < series.length; i++) {
            expect(series[i]!.bucketStart.getTime()).toBeGreaterThan(series[i - 1]!.bucketStart.getTime());
        }
    });
});
