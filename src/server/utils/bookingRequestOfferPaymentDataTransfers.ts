import type { BookingRequestOfferPaymentData } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** All persisted top-up transfer ids (legacy `extraTransferId` + `extraTransferIds`), oldest first. */
function paymentDataExtraTransferIds(paymentData: BookingRequestOfferPaymentData | null | undefined): string[] {
    if (!paymentData) return [];
    const ids: string[] = [];
    if ('extraTransferIds' in paymentData && paymentData.extraTransferIds) {
        for (const id of paymentData.extraTransferIds) {
            if (id && !ids.includes(id)) ids.push(id);
        }
    }
    if ('extraTransferId' in paymentData && paymentData.extraTransferId && !ids.includes(paymentData.extraTransferId)) {
        ids.push(paymentData.extraTransferId);
    }
    return ids;
}

/** Append a Connect top-up id without dropping prior top-ups. */
export function paymentDataWithExtraTransfer(
    paymentData: BookingRequestOfferPaymentData,
    transferId: string,
): BookingRequestOfferPaymentData {
    const extraTransferIds = paymentDataExtraTransferIds(paymentData);
    if (!extraTransferIds.includes(transferId)) {
        extraTransferIds.push(transferId);
    }
    return {
        ...paymentData,
        extraTransferIds,
        extraTransferId: transferId,
    };
}

/**
 * Connect transfer ids to reverse on a cook payout decrease (newest first):
 * top-ups, amendment PI destination transfers, then primary transfer / PI destination.
 */
export async function paymentTransferIdsForCookReverse(
    serverRuntime: Pick<ServerRuntime, 'stripe'>,
    paymentData: BookingRequestOfferPaymentData | null,
): Promise<string[]> {
    if (!paymentData) return [];

    const newestFirst: string[] = [];
    const pushUnique = (id: string | undefined) => {
        if (id && !newestFirst.includes(id)) newestFirst.push(id);
    };

    for (const id of [...paymentDataExtraTransferIds(paymentData)].reverse()) {
        pushUnique(id);
    }

    if ('amendmentPaymentIntentIds' in paymentData && paymentData.amendmentPaymentIntentIds) {
        for (let index = paymentData.amendmentPaymentIntentIds.length - 1; index >= 0; index -= 1) {
            const paymentIntentId = paymentData.amendmentPaymentIntentIds[index];
            if (!paymentIntentId) continue;
            // Skip unpaid pending-delta PI — it has no destination transfer yet.
            const pendingId = 'pendingDeltaPayment' in paymentData ? paymentData.pendingDeltaPayment?.paymentIntentId : undefined;
            if (pendingId && paymentIntentId === pendingId) continue;
            const destinationTransferId = await serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne(paymentIntentId);
            pushUnique(destinationTransferId);
        }
    }

    if ('transferId' in paymentData && paymentData.transferId) {
        pushUnique(paymentData.transferId);
    } else if ('paymentIntentId' in paymentData && paymentData.paymentIntentId) {
        const destinationTransferId = await serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne(paymentData.paymentIntentId);
        pushUnique(destinationTransferId);
    }

    return newestFirst;
}

/** Chunk a cook payout reverse across transfers (newest first), like customer refunds. */
export async function cookPayoutDeltaReverse(
    serverRuntime: Pick<ServerRuntime, 'stripe'>,
    transferIds: string[],
    amountCents: number,
    idempotencyKeyPrefix: string,
): Promise<void> {
    if (amountCents <= 0) return;
    if (transferIds.length === 0) {
        throw new Error('cookPayoutDeltaReverse: no Connect transfers to reverse for cook payout decrease');
    }

    let remaining = amountCents;
    for (let index = 0; index < transferIds.length && remaining > 0; index += 1) {
        const transferId = transferIds[index]!;
        const reversible = await serverRuntime.stripe.transferReversibleCentsFindOne(transferId);
        if (reversible <= 0) continue;
        const chunk = Math.min(remaining, reversible);
        await serverRuntime.stripe.transferReverse({
            transferId,
            amountCents: chunk,
            idempotencyKey: `${idempotencyKeyPrefix}:${index}`,
        });
        remaining -= chunk;
    }

    if (remaining > 0) {
        throw new Error('cookPayoutDeltaReverse: reversible Connect transfer amount insufficient for cook payout decrease');
    }
}
