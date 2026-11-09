import { and, eq } from 'drizzle-orm';

import { invoiceAddressNormalize } from '../../shared/invoiceAddressNormalize';
import { giftCards } from '../db/schema';
import type { GiftCardInvoiceAddress } from '../domain/giftCard';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationGiftCardPayArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { giftCardPayFinalize } from '../utils/giftCardPayFinalize';

export async function giftCardPay(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationGiftCardPayArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, requestingSession, serverRuntime);

    const input = args.input;
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(giftCards)
            .where(
                and(
                    eq(giftCards.giftCardId, input.giftCardId),
                    eq(giftCards.sessionId, requestingSession.sessionId),
                    eq(giftCards.buyerUserId, userId),
                ),
            )
            .limit(1);

        if (!row) {
            return { success: false };
        }

        const invoiceAddress: GiftCardInvoiceAddress = invoiceAddressNormalize(input.invoiceAddress);

        if (row.paymentStatus === 'PAYED') {
            await giftCardPayFinalize(serverRuntime, row, invoiceAddress);
            return { success: true, referenceId: row.giftCardId };
        }

        const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(row.paymentIntentId);
        if (!succeeded) {
            return { success: false };
        }

        await serverRuntime.stripe.customerUpdate({
            userId,
            emailAddress: row.buyerEmail,
            firstName: invoiceAddress.firstName,
            lastName: invoiceAddress.lastName,
            address: {
                country: invoiceAddress.country,
                city: invoiceAddress.city,
                postCode: invoiceAddress.postalCode,
                line1: invoiceAddress.line1,
                line2: invoiceAddress.line2 || undefined,
            },
        });

        await giftCardPayFinalize(serverRuntime, row, invoiceAddress);

        return { success: true, referenceId: row.giftCardId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
