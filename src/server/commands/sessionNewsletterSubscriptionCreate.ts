import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import type { NewsletterSubscriptionCreate } from '../db/schema';
import { newsletterSubscriptions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { sessionEventCreate } from '../utils/sessionEventCreate';

function emailNormalize(emailAddress: string): string {
    return emailAddress.trim().toLowerCase();
}

/**
 * Footer / marketing newsletter subscribe. Idempotent on email: already-subscribed
 * returns success with a session event. Optional Klaviyo list subscribe when
 * `KLAVIYO_NEWSLETTER_LIST_ID` is set.
 */
export async function sessionNewsletterSubscriptionCreate(
    requestingSession: GqlSSession,
    args: { emailAddress: string; locale: Locale },
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const emailAddress = emailNormalize(args.emailAddress);
    if (!emailAddress || !emailAddress.includes('@')) {
        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'NEWSLETTER_SUBSCRIPTION_FAILED',
            payload: {},
        });
        throw new Error('sessionNewsletterSubscriptionCreate: invalid email address');
    }

    try {
        const [existing] = await serverRuntime.db
            .select({ newsletterSubscriptionId: newsletterSubscriptions.newsletterSubscriptionId })
            .from(newsletterSubscriptions)
            .where(eq(newsletterSubscriptions.emailAddress, emailAddress))
            .limit(1);

        if (existing) {
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'NEWSLETTER_SUBSCRIPTION_ALREADY_EXISTS',
                payload: {},
            });
            return { success: true, referenceId: existing.newsletterSubscriptionId };
        }

        let userId = requestingSession.userId ?? null;
        if (!userId) {
            const [matched] = await serverRuntime.db
                .select({ userId: users.userId })
                .from(users)
                .where(eq(users.emailAddress, emailAddress))
                .limit(1);
            userId = matched?.userId ?? null;
        }

        const newsletterSubscriptionId = idCreate();
        const row: NewsletterSubscriptionCreate = {
            newsletterSubscriptionId,
            emailAddress,
            userId,
            sessionId: requestingSession.sessionId,
            locale: args.locale,
            source: 'FOOTER',
        };

        await serverRuntime.db.insert(newsletterSubscriptions).values(row);

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'NEWSLETTER_SUBSCRIPTION_CREATED',
            payload: {},
        });

        try {
            await serverRuntime.klaviyo.newsletterSubscribe({
                email: emailAddress,
                externalId: userId,
                locale: args.locale,
            });
        } catch (error) {
            serverRuntime.log.error(
                error instanceof Error
                    ? new Error(`sessionNewsletterSubscriptionCreate: Klaviyo subscribe failed: ${error.message}`, {
                          cause: error,
                      })
                    : error,
                requestingSession,
            );
        }

        return { success: true, referenceId: newsletterSubscriptionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
