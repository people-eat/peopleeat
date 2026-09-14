import type { ServerRuntime } from '../domain/ServerRuntime';
import type { StripeWebhookEvent } from '../stripe/StripePayment';
import { bookingRequestOfferPaymentFailedApply } from './bookingRequestOfferPaymentFailedApply';
import { bookingRequestOfferPaymentIntentSucceededApply } from './bookingRequestOfferPaymentIntentSucceededApply';
import { bookingRequestOfferSetupIntentSucceededApply } from './bookingRequestOfferSetupIntentSucceededApply';
import { cookStripeAccountStatusApply } from './cookStripeAccountStatusApply';

function objectId(dataObject: unknown): string | undefined {
    if (dataObject && typeof dataObject === 'object' && 'id' in dataObject) {
        const id = (dataObject as { id?: unknown }).id;
        return typeof id === 'string' ? id : undefined;
    }
    return undefined;
}

/**
 * Dispatches a verified Stripe webhook event. Unknown / ack-only types are
 * no-ops (caller still returns 200).
 */
export async function stripeWebhookApply(event: StripeWebhookEvent, serverRuntime: ServerRuntime): Promise<void> {
    const id = objectId(event.dataObject);

    switch (event.type) {
        case 'payment_intent.succeeded':
        case 'payment_intent.processing': {
            if (id) {
                await bookingRequestOfferPaymentIntentSucceededApply(id, serverRuntime);
            }
            return;
        }
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled': {
            if (id) {
                await bookingRequestOfferPaymentFailedApply(id, 'paymentIntentId', serverRuntime, event.type);
            }
            return;
        }
        case 'setup_intent.succeeded': {
            if (id) {
                await bookingRequestOfferSetupIntentSucceededApply(id, serverRuntime);
            }
            return;
        }
        case 'setup_intent.setup_failed':
        case 'setup_intent.canceled': {
            if (id) {
                await bookingRequestOfferPaymentFailedApply(id, 'setupIntentId', serverRuntime, event.type);
            }
            return;
        }
        case 'account.updated': {
            if (id) {
                await cookStripeAccountStatusApply({ stripeAccountId: id }, serverRuntime);
            }
            return;
        }
        default:
            return;
    }
}
