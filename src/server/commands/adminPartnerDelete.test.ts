import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, partners } from '../db/schema';
import {
    adminMutationParent,
    commandSetup,
    findLogsForSession,
    partnerOrgInsert,
    partnerVenueInsert,
    testDb,
} from '../test/commandTestUtils';
import { adminPartnerDelete } from './adminPartnerDelete';

describe('adminPartnerDelete', () => {
    it('deletes a partner with no venues and publishes adminUpdates', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-delete-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const partnerId = await partnerOrgInsert('Acme');

        const result = await adminPartnerDelete(
            adminMutationParent(admin.user.userId),
            { partnerId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: partnerId });
        const rows = await testDb.select().from(partners).where(eq(partners.partnerId, partnerId));
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects delete while venues exist', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-delete-venues', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const venue = await partnerVenueInsert({ name: 'Loft' });

        await expect(
            adminPartnerDelete(
                adminMutationParent(admin.user.userId),
                { partnerId: venue.partnerId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/still has venues/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
    });

    it('throws when the partner is missing', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-delete-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPartnerDelete(
                adminMutationParent(admin.user.userId),
                { partnerId: idCreate() },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/partner not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});
