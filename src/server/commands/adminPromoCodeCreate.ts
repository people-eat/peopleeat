import { idCreate } from '../../shared/idCreate';
import type { PromoCodeCreate } from '../db/schema';
import { promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationPromoCodeCreateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPromoCodeCreate(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationPromoCodeCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const redeemCode = input.redeemCode.trim();
    if (redeemCode.length === 0) {
        throw new Error('adminPromoCodeCreate: redeemCode must not be empty');
    }
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
        throw new Error('adminPromoCodeCreate: amountCents must be a positive integer');
    }
    if (
        input.minimumTotalAmountCustomerCents != null &&
        (!Number.isInteger(input.minimumTotalAmountCustomerCents) || input.minimumTotalAmountCustomerCents <= 0)
    ) {
        throw new Error('adminPromoCodeCreate: minimumTotalAmountCustomerCents must be a positive integer when set');
    }
    const expiresAt = new Date(input.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new Error('adminPromoCodeCreate: expiresAt must be in the future');
    }

    const promoCodeId = idCreate();
    const values: PromoCodeCreate = {
        promoCodeId,
        redeemCode,
        amountCents: input.amountCents,
        minimumTotalAmountCustomerCents: input.minimumTotalAmountCustomerCents ?? null,
        expiresAt,
    };

    try {
        await serverRuntime.db.insert(promoCodes).values(values);
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: promoCodeId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
