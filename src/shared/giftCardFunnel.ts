/**
 * Stable gift-card purchase funnel step ids shared by client instrumentation
 * and admin Sankey aggregation. See docs/architecture/session-events.md.
 */

export const giftCardFunnelSteps = ['configure', 'auth', 'created', 'checkout', 'paid'] as const;

export type GiftCardFunnelStep = (typeof giftCardFunnelSteps)[number];

/** Client-emitted mid-funnel steps (lifecycle events cover created / paid). */
export const giftCardFunnelClientSteps = ['configure', 'auth', 'checkout'] as const;

export type GiftCardFunnelClientStep = (typeof giftCardFunnelClientSteps)[number];

export const giftCardFunnelArea = 'gift_card' as const;

export type GiftCardFunnelInteraction =
    { type: 'step_entered'; step: GiftCardFunnelClientStep } | { type: 'step_completed'; step: GiftCardFunnelClientStep };

export function isGiftCardFunnelStep(value: string): value is GiftCardFunnelStep {
    return (giftCardFunnelSteps as readonly string[]).includes(value);
}

export function isGiftCardFunnelClientStep(value: string): value is GiftCardFunnelClientStep {
    return (giftCardFunnelClientSteps as readonly string[]).includes(value);
}
