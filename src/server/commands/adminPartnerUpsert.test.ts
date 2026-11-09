import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, partners } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, partnerOrgInsert, testDb } from '../test/commandTestUtils';
import { adminPartnerUpsert } from './adminPartnerUpsert';

describe('adminPartnerUpsert', () => {
    it('inserts a new partner and publishes adminUpdates', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-create', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        const result = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            { input: { name: '  Acme Co  ' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(partners).where(eq(partners.partnerId, result.referenceId!));
        expect(row?.name).toBe('Acme Co');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('renames an existing partner', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-rename', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const partnerId = await partnerOrgInsert('Old');

        const result = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            { input: { partnerId, name: 'Neu' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: partnerId });
        const [row] = await testDb.select().from(partners).where(eq(partners.partnerId, partnerId));
        expect(row?.name).toBe('Neu');
    });

    it('rejects an empty name without publishing', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-empty', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPartnerUpsert(
                adminMutationParent(admin.user.userId),
                { input: { name: '   ' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/required fields must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
    });

    it('rejects an unknown partnerId without publishing', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPartnerUpsert(
                adminMutationParent(admin.user.userId),
                { input: { partnerId: idCreate(), name: 'Acme' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/partner not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});
