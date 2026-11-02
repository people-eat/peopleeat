/**
 * Customer id already attached to a PaymentMethod, if any.
 * Off-session charges must reuse this Customer — not a re-resolved
 * `customerEnsure` result — or Stripe rejects the PaymentMethod.
 */
export function stripePaymentMethodOwnedCustomerId(
    customer: string | { id: string } | null | undefined,
): string | undefined {
    if (typeof customer === 'string') return customer;
    if (customer && typeof customer.id === 'string') return customer.id;
    return undefined;
}
