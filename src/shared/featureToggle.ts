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
    'COOK_PUBLIC_PROFILE_PATH_NAME',
    // Published menus section on /chefs/$pathName (+ cook public preview).
    'COOK_PUBLIC_PROFILE_MENUS',
    'COOK_PRESENCE_LINKS',
    // Cook profile invite entry (sidebar / invite page). Attribution and rewards stay on.
    'COOK_INVITE',
    'BOOKING_REQUEST_RESTRICTIONS',
    'BOOKING_REQUEST_SETTING',
    'BOOKING_REQUEST_KITCHEN_DETAILS',
    // Plan funnel: history-based expected menu-price range instead of price-class cards.
    'BOOKING_REQUEST_EXPECTED_MENU_PRICE_RANGE',
    'BOOKING_REQUEST_COOK_DIRECT',
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
    'VENUE_PAGE_VENUES_EXPLORE',
    'SIGN_IN_GOOGLE',
    'SIGN_IN_FACEBOOK',
    // Last 4 chef profiles visited this session on chef + blog pages.
    'LAST_VISITED_COOK_PROFILES',
] as const;

export type FeatureToggleKey = (typeof featureToggleKeys)[number];

export function featureToggleIsActive(activeKeys: readonly FeatureToggleKey[], key: FeatureToggleKey): boolean {
    return activeKeys.includes(key);
}
