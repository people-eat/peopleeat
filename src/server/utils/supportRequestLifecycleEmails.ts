import { eq } from 'drizzle-orm';

import type { Locale } from '../../shared/locale';
import { supportRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { supportRequestEmailCustomerUrl } from '../email/components/supportRequestEmailUrls';
import {
    AdminSupportRequestMessageCreateForCustomerEmail,
    adminSupportRequestMessageCreateForCustomerEmailSubject,
} from '../email/templates/AdminSupportRequestMessageCreateForCustomerEmail';
import {
    AdminSupportRequestResolveForCustomerEmail,
    adminSupportRequestResolveForCustomerEmailSubject,
} from '../email/templates/AdminSupportRequestResolveForCustomerEmail';
import {
    UserSupportRequestCreateForCustomerEmail,
    userSupportRequestCreateForCustomerEmailSubject,
} from '../email/templates/UserSupportRequestCreateForCustomerEmail';
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

async function supportRequestCustomerLoad(
    serverRuntime: ServerRuntime,
    supportRequestId: string,
): Promise<{
    supportRequestId: string;
    subject: string;
    userId: string;
    emailAddress: string;
    firstName: string;
    locale: Locale;
} | null> {
    const [row] = await serverRuntime.db
        .select({
            supportRequestId: supportRequests.supportRequestId,
            subject: supportRequests.subject,
            userId: supportRequests.userId,
            emailAddress: users.emailAddress,
            firstName: users.firstName,
            locale: users.locale,
        })
        .from(supportRequests)
        .innerJoin(users, eq(users.userId, supportRequests.userId))
        .where(eq(supportRequests.supportRequestId, supportRequestId))
        .limit(1);

    return emailAddressPresent(row);
}

/**
 * Customer receipt after support-request create. Failures are logged and do not undo the write.
 */
export async function userSupportRequestCreateEmailSend(serverRuntime: ServerRuntime, args: { supportRequestId: string }): Promise<void> {
    const customer = await supportRequestCustomerLoad(serverRuntime, args.supportRequestId);
    if (!customer) {
        return;
    }

    const locale = customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    const supportRequestUrl = supportRequestEmailCustomerUrl(webPageUrl, customer.supportRequestId);

    await sendSafely(serverRuntime, 'userSupportRequestCreateEmailSend', args.supportRequestId, () =>
        serverRuntime.email.send({
            to: customer.emailAddress,
            subject: userSupportRequestCreateForCustomerEmailSubject(locale),
            react: UserSupportRequestCreateForCustomerEmail({
                locale,
                webPageUrl,
                recipientFirstName: customer.firstName,
                subject: customer.subject,
                supportRequestUrl,
            }),
            purpose: 'SUPPORT_REQUEST_CREATED',
            locale,
            relatedEntity: { type: 'SUPPORT_REQUEST', id: customer.supportRequestId },
            userId: customer.userId,
        }),
    );
}

/**
 * Notify the customer that an admin replied in the support chat.
 */
export async function adminSupportRequestMessageCreateEmailSend(
    serverRuntime: ServerRuntime,
    args: { supportRequestId: string },
): Promise<void> {
    const customer = await supportRequestCustomerLoad(serverRuntime, args.supportRequestId);
    if (!customer) {
        return;
    }

    const locale = customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    const supportRequestUrl = supportRequestEmailCustomerUrl(webPageUrl, customer.supportRequestId);

    await sendSafely(serverRuntime, 'adminSupportRequestMessageCreateEmailSend', args.supportRequestId, () =>
        serverRuntime.email.send({
            to: customer.emailAddress,
            subject: adminSupportRequestMessageCreateForCustomerEmailSubject(locale),
            react: AdminSupportRequestMessageCreateForCustomerEmail({
                locale,
                webPageUrl,
                recipientFirstName: customer.firstName,
                subject: customer.subject,
                supportRequestUrl,
            }),
            purpose: 'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN',
            locale,
            relatedEntity: { type: 'SUPPORT_REQUEST', id: customer.supportRequestId },
            userId: customer.userId,
        }),
    );
}

/**
 * Notify the customer that their support request was marked resolved.
 */
export async function adminSupportRequestResolveEmailSend(serverRuntime: ServerRuntime, args: { supportRequestId: string }): Promise<void> {
    const customer = await supportRequestCustomerLoad(serverRuntime, args.supportRequestId);
    if (!customer) {
        return;
    }

    const locale = customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    const supportRequestUrl = supportRequestEmailCustomerUrl(webPageUrl, customer.supportRequestId);

    await sendSafely(serverRuntime, 'adminSupportRequestResolveEmailSend', args.supportRequestId, () =>
        serverRuntime.email.send({
            to: customer.emailAddress,
            subject: adminSupportRequestResolveForCustomerEmailSubject(locale),
            react: AdminSupportRequestResolveForCustomerEmail({
                locale,
                webPageUrl,
                recipientFirstName: customer.firstName,
                subject: customer.subject,
                supportRequestUrl,
            }),
            purpose: 'SUPPORT_REQUEST_RESOLVED',
            locale,
            relatedEntity: { type: 'SUPPORT_REQUEST', id: customer.supportRequestId },
            userId: customer.userId,
        }),
    );
}
