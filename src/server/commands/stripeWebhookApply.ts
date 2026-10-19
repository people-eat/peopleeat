import type { ServerRuntime } from '../domain/ServerRuntime';
import type { StripeWebhookEvent } from '../stripe/StripePayment';
import { bookingRequestOfferPaymentFailedApply } from './bookingRequestOfferPaymentFailedApply';
import { bookingRequestOfferPaymentIntentSucceededApply } from './bookingRequestOfferPaymentIntentSucceededApply';
import { bookingRequestOfferSetupIntentSucceededApply } from './bookingRequestOfferSetupIntentSucceededApply';
import { cookStripeAccountStatusApply } from './cookStripeAccountStatusApply';

/** Subscribed Dashboard events we ack without a DB write (see stripe-payment.md). */
const STRIPE_WEBHOOK_ACK_ONLY_TYPES = new Set([
    'payment_intent.created',
    'payment_intent.amount_capturable_updated',
    'payment_intent.partially_funded',
    'payment_intent.requires_action',
    'setup_intent.created',
    'setup_intent.requires_action',
]);

function objectId(dataObject: unknown): string | undefined {
    if (dataObject && typeof dataObject === 'object' && 'id' in dataObject) {
        const id = (dataObject as { id?: unknown }).id;
        return typeof id === 'string' ? id : undefined;
    }
    return undefined;
}

/**
 * Dispatches a verified Stripe webhook event. Ack-only types are silent no-ops
 * (caller still returns 200). Unexpected types and handled events missing an
 * object id are logged at warn.
 */
export async function stripeWebhookApply(event: StripeWebhookEvent, serverRuntime: ServerRuntime): Promise<void> {
    const id = objectId(event.dataObject);

    switch (event.type) {
        case 'payment_intent.succeeded':
        case 'payment_intent.processing': {
            if (!id) {
                serverRuntime.log.warn(`stripeWebhookApply: missing object id for type=${event.type}`);
                return;
            }
            await bookingRequestOfferPaymentIntentSucceededApply(id, serverRuntime);
            return;
        }
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled': {
            if (!id) {
                serverRuntime.log.warn(`stripeWebhookApply: missing object id for type=${event.type}`);
                return;
            }
            await bookingRequestOfferPaymentFailedApply(id, 'paymentIntentId', serverRuntime, event.type);
            return;
        }
        case 'setup_intent.succeeded': {
            if (!id) {
                serverRuntime.log.warn(`stripeWebhookApply: missing object id for type=${event.type}`);
                return;
            }
            await bookingRequestOfferSetupIntentSucceededApply(id, serverRuntime);
            return;
        }
        case 'setup_intent.setup_failed':
        case 'setup_intent.canceled': {
            if (!id) {
                serverRuntime.log.warn(`stripeWebhookApply: missing object id for type=${event.type}`);
                return;
            }
            await bookingRequestOfferPaymentFailedApply(id, 'setupIntentId', serverRuntime, event.type);
            return;
        }
        case 'account.updated': {
            if (!id) {
                serverRuntime.log.warn(`stripeWebhookApply: missing object id for type=${event.type}`);
                return;
            }
            await cookStripeAccountStatusApply({ stripeAccountId: id }, serverRuntime);
            return;
        }
        default:
            if (!STRIPE_WEBHOOK_ACK_ONLY_TYPES.has(event.type)) {
                serverRuntime.log.warn(`stripeWebhookApply: unexpected event type=${event.type}`);
            }
            return;
    }
}
