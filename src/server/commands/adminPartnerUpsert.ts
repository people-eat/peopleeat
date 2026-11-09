import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeTitled } from '../../shared/textNormalize';
import { partners } from '../db/schema';
import type { PartnerCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationPartnerUpsertArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPartnerUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationPartnerUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const name = textNormalizeTitled(input.name);
        if (!name) {
            throw new Error('adminPartnerUpsert: required fields must not be empty');
        }

        const now = new Date();
        const partnerId = input.partnerId ?? idCreate();

        if (input.partnerId) {
            const [existing] = await serverRuntime.db.select().from(partners).where(eq(partners.partnerId, input.partnerId)).limit(1);
            if (!existing) {
                throw new Error('adminPartnerUpsert: partner not found');
            }
            await serverRuntime.db.update(partners).set({ name, updatedAt: now }).where(eq(partners.partnerId, partnerId));
        } else {
            const values: PartnerCreate = { partnerId, name, createdAt: now, updatedAt: now };
            await serverRuntime.db.insert(partners).values(values);
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
