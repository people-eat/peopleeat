import { eq } from 'drizzle-orm';

import { users } from '../../db/schema';
import type { QueuedJobDefinition } from '../types';

interface UserKlaviyoProfileSyncData {
    userId: string;
}

/**
 * Upserts the user into Klaviyo for marketing-list continuity (not transactional mail).
 * Enqueued after signup and verified email-address changes. No-ops when
 * `KLAVIYO_PRIVATE_API_KEY` is unset. Retries on API failure via pg-boss.
 */
export const userKlaviyoProfileSync: QueuedJobDefinition<UserKlaviyoProfileSyncData> = {
    kind: 'queued',
    name: 'user-klaviyo-profile-sync',
    handler: async ({ data, serverRuntime }) => {
        if (!serverRuntime.klaviyo.isConfigured()) {
            return;
        }

        const [user] = await serverRuntime.db
            .select({
                userId: users.userId,
                emailAddress: users.emailAddress,
                firstName: users.firstName,
                lastName: users.lastName,
                phoneNumber: users.phoneNumber,
            })
            .from(users)
            .where(eq(users.userId, data.userId))
            .limit(1);

        if (!user) {
            serverRuntime.log.debug(`userKlaviyoProfileSync: user ${data.userId} not found — skipping`);
            return;
        }

        if (user.emailAddress == null || user.emailAddress.length === 0) {
            serverRuntime.log.debug(`userKlaviyoProfileSync: user ${data.userId} has no email — skipping`);
            return;
        }

        await serverRuntime.klaviyo.profileUpsert({
            externalId: user.userId,
            email: user.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
        });
    },
    options: {
        retryLimit: 5,
        retryDelay: 60,
        expireInSeconds: 3600,
    },
};
