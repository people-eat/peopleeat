import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, partnerVenueCooks } from '../db/schema';
import { adminMutationParent, commandSetup, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { adminPartnerVenueCooksUpdate } from './adminPartnerVenueCooksUpdate';

describe('adminPartnerVenueCooksUpdate', () => {
    it('replaces the ordered venue cook assignment', async () => {
        const admin = await commandSetup.withUser({ firstName: 'venue-cooks-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const venue = await partnerVenueInsert({ name: 'Loft' });
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Venue' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        const result = await adminPartnerVenueCooksUpdate(
            adminMutationParent(admin.user.userId),
            { partnerVenueId: venue.partnerVenueId, cookIds: [cook.user.userId] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: venue.partnerVenueId });
        const rows = await testDb.select().from(partnerVenueCooks).where(eq(partnerVenueCooks.partnerVenueId, venue.partnerVenueId));
        expect(rows).toEqual([expect.objectContaining({ cookId: cook.user.userId, position: 0 })]);
    });

    it('rejects an unknown venue without publishing', async () => {
        const admin = await commandSetup.withUser({ firstName: 'venue-cooks-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPartnerVenueCooksUpdate(
                adminMutationParent(admin.user.userId),
                { partnerVenueId: idCreate(), cookIds: [] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/partner venue not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});
