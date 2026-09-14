import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, partnerCooks, partners } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminPartnerCooksUpdate } from './adminPartnerCooksUpdate';

describe('adminPartnerCooksUpdate', () => {
    it('replaces the ordered partner cook assignment', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-cooks-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const partnerId = idCreate();
        await testDb.insert(partners).values({
            partnerId,
            pathName: `partner-${partnerId.slice(0, 8)}`,
            name: 'Partner',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Partner' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        // Act
        const result = await adminPartnerCooksUpdate(
            adminMutationParent(admin.user.userId),
            { partnerId, cookIds: [cook.user.userId] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: partnerId });
        const rows = await testDb.select().from(partnerCooks).where(eq(partnerCooks.partnerId, partnerId));
        expect(rows).toEqual([expect.objectContaining({ cookId: cook.user.userId, position: 0 })]);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown partner without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-cooks-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminPartnerCooksUpdate(
                adminMutationParent(admin.user.userId),
                { partnerId: idCreate(), cookIds: [] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/partner not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
    });
});
