import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, partners } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminPartnerDelete } from './adminPartnerDelete';

describe('adminPartnerDelete', () => {
    it('deletes the partner and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-delete-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const partnerId = idCreate();
        await testDb.insert(partners).values({
            partnerId,
            pathName: `delete-partner-${partnerId.slice(0, 8)}`,
            name: 'Acme',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });

        // Act
        const result = await adminPartnerDelete(
            adminMutationParent(admin.user.userId),
            { partnerId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: partnerId });
        const rows = await testDb.select().from(partners).where(eq(partners.partnerId, partnerId));
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('throws when the partner is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-delete-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const partnerId = idCreate();

        // Act + Assert
        await expect(
            adminPartnerDelete(adminMutationParent(admin.user.userId), { partnerId }, admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/partner not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/partner not found/);
    });
});
