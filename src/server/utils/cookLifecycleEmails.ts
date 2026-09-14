import { eq } from 'drizzle-orm';

import type { Locale } from '../../shared/locale';
import { cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    AdminCookApprovalUpdateForCookEmail,
    adminCookApprovalUpdateForCookEmailSubject,
} from '../email/templates/AdminCookApprovalUpdateForCookEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { emailAddressPresent } from './emailAddressPresent';

async function sendSafely(serverRuntime: ServerRuntime, label: string, entityId: string, send: () => Promise<unknown>): Promise<void> {
    try {
        await send();
    } catch (error) {
        serverRuntime.log.error(
            error instanceof Error ? new Error(`${label}: email failed for ${entityId}: ${error.message}`, { cause: error }) : error,
            null,
        );
    }
}

async function cookUserLoad(
    serverRuntime: ServerRuntime,
    cookId: string,
): Promise<{ cookId: string; emailAddress: string; firstName: string; locale: Locale } | null> {
    const [row] = await serverRuntime.db
        .select({
            cookId: cooks.cookId,
            emailAddress: users.emailAddress,
            firstName: users.firstName,
            locale: users.locale,
        })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(eq(cooks.cookId, cookId))
        .limit(1);

    return emailAddressPresent(row);
}

/**
 * Notify the cook that an admin approved their profile. Failures are logged and do not undo the write.
 */
export async function adminCookApprovalUpdateEmailSend(serverRuntime: ServerRuntime, args: { cookId: string }): Promise<void> {
    const cookUser = await cookUserLoad(serverRuntime, args.cookId);
    if (!cookUser) {
        return;
    }

    const locale = cookUser.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    const profileUrl = `${webPageUrl}/profile`;

    await sendSafely(serverRuntime, 'adminCookApprovalUpdateEmailSend', args.cookId, () =>
        serverRuntime.email.send({
            to: cookUser.emailAddress,
            subject: adminCookApprovalUpdateForCookEmailSubject(locale),
            react: AdminCookApprovalUpdateForCookEmail({
                locale,
                webPageUrl,
                recipientFirstName: cookUser.firstName,
                profileUrl,
            }),
            purpose: 'COOK_APPROVED_BY_ADMIN',
            locale,
            relatedEntity: { type: 'COOK', id: cookUser.cookId },
            userId: cookUser.cookId,
        }),
    );
}
