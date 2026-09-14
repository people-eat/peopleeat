import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, promoCodes } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminPromoCodeCreate } from './adminPromoCodeCreate';

describe('adminPromoCodeCreate', () => {
    it('creates a promo code and returns its id', async () => {
        const admin = await commandSetup.withUser({ firstName: 'promo-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const redeemCode = `SAVE10-${idCreate().slice(0, 8)}`;

        const result = await adminPromoCodeCreate(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    redeemCode: `  ${redeemCode}  `,
                    amountCents: 1000,
                    minimumTotalAmountCustomerCents: 20000,
                    expiresAt,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(promoCodes).where(eq(promoCodes.promoCodeId, result.referenceId!));
        expect(row).toMatchObject({
            redeemCode,
            amountCents: 1000,
            minimumTotalAmountCustomerCents: 20000,
        });
        expect(row?.expiresAt.getTime()).toBe(expiresAt.getTime());
    });

    it('rejects an empty redeem code', async () => {
        const admin = await commandSetup.withUser({ firstName: 'promo-admin-2', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPromoCodeCreate(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        redeemCode: '   ',
                        amountCents: 1000,
                        expiresAt: new Date(Date.now() + 60_000),
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/redeemCode must not be empty/);
    });

    it('rejects a past expiration', async () => {
        const admin = await commandSetup.withUser({ firstName: 'promo-admin-3', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPromoCodeCreate(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        redeemCode: 'EXPIRED',
                        amountCents: 500,
                        expiresAt: new Date(Date.now() - 60_000),
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/expiresAt must be in the future/);
    });
});
