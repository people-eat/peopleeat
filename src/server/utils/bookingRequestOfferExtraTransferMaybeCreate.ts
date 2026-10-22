import type { ServerRuntime } from '../domain/ServerRuntime';

/**
 * After a PaymentIntent succeeds, move any leftover cook payout that the
 * destination charge did not cover (payout > pull). Returns the new transfer
 * id when a top-up was created so callers can persist it via
 * `paymentDataWithExtraTransfer`.
 */
export async function bookingRequestOfferExtraTransferMaybeCreate(
    serverRuntime: Pick<ServerRuntime, 'stripe'>,
    input: {
        destinationAccountId: string;
        userId: string;
        totalCentsCustomer: number;
        payoutCentsCook: number;
        idempotencyKey?: string;
    },
): Promise<string | undefined> {
    const { destinationAccountId, userId, totalCentsCustomer, payoutCentsCook, idempotencyKey } = input;
    if (payoutCentsCook <= totalCentsCustomer) return undefined;
    const { transferId } = await serverRuntime.stripe.transferCreate({
        destinationAccountId,
        payoutAmount: payoutCentsCook - totalCentsCustomer,
        transferGroup: `${destinationAccountId}:${userId}`,
        idempotencyKey,
    });
    return transferId;
}
