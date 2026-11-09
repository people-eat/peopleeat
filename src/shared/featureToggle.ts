/**
 * Canonical feature-toggle keys. Mirrored by GraphQL `FeatureToggleKey`.
 * Missing DB rows are treated as disabled. See docs/features/admin-feature-toggles.md.
 */
export const featureToggleKeys = [
    'AI_MENU_EVALUATION',
    'AI_MENU_CREATE',
    'AI_BOOKING_REQUEST_MESSAGE',
    'COOK_BIOGRAPHY_AI_WRITE',
    'COOK_WALLET_STRIPE_BALANCE',
    'COOK_ANALYTICS',
    'COOK_PUBLIC_PROFILE_SHARE',
    'COOK_PRESENCE_LINKS',
    'BOOKING_REQUEST_RESTRICTIONS',
    'BOOKING_REQUEST_SETTING',
    'BOOKING_REQUEST_KITCHEN_DETAILS',
    'BOOKING_REQUEST_OFFER_CHAT_REACTIONS',
    'BOOKING_REQUEST_OFFER_AMENDMENT',
    'BOOKING_REQUEST_OFFER_PRICE_IMPACT_PREVIEW',
    'BOOKING_REQUEST_OFFER_PREPARATIONS_COMPLETE',
    'BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS',
    'BOOKING_REQUEST_OFFER_ADDONS',
    'ASSISTANT_CUSTOMER',
    'ASSISTANT_COOK',
    'PUBLICATION_MEALS',
    'PUBLICATION_MENUS',
    'LANDING_BOOKING_HOW_IT_WORKS',
    'LANDING_TESTIMONIAL_CARDS',
    'PARTNER_PAGE_PARTNERS_EXPLORE',
    'SIGN_IN_GOOGLE',
] as const;

export type FeatureToggleKey = (typeof featureToggleKeys)[number];

export function featureToggleIsActive(activeKeys: readonly FeatureToggleKey[], key: FeatureToggleKey): boolean {
    return activeKeys.includes(key);
}
