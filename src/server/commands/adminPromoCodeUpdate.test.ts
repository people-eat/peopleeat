import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, promoCodes } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminPromoCodeCreate } from './adminPromoCodeCreate';
import { adminPromoCodeUpdate } from './adminPromoCodeUpdate';

describe('adminPromoCodeUpdate', () => {
    it('updates expiresAt including immediate expire', async () => {
        const admin = await commandSetup.withUser({ firstName: 'promo-update-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const created = await adminPromoCodeCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    redeemCode: `UPD-${idCreate().slice(0, 8)}`,
                    amountCents: 1500,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const promoCodeId = created.referenceId!;
        const expiresAt = new Date(Date.now() - 1000);

        const result = await adminPromoCodeUpdate(
            adminMutationParent(admin.user.userId),
            { input: { promoCodeId, expiresAt } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBe(promoCodeId);
        const [row] = await testDb.select().from(promoCodes).where(eq(promoCodes.promoCodeId, promoCodeId));
        expect(row?.expiresAt.getTime()).toBe(expiresAt.getTime());
    });

    it('rejects an unknown promo code', async () => {
        const admin = await commandSetup.withUser({ firstName: 'promo-update-admin-2', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPromoCodeUpdate(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        promoCodeId: idCreate(),
                        expiresAt: new Date(Date.now() + 60_000),
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/promo code not found/);
    });
});
