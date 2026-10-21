/**
 * Canonical feature-toggle keys. Mirrored by GraphQL `FeatureToggleKey`.
 * Missing DB rows are treated as disabled. See docs/features/admin-feature-toggles.md.
 */
export const featureToggleKeys = [
    'AI_MENU_EVALUATION',
    'AI_BOOKING_REQUEST_MESSAGE',
    'COOK_BIOGRAPHY_AI_WRITE',
    'COOK_WALLET_STRIPE_BALANCE',
    'BOOKING_REQUEST_RESTRICTIONS',
    'BOOKING_REQUEST_OFFER_CHAT_REACTIONS',
    'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT',
    'ASSISTANT_CUSTOMER',
    'ASSISTANT_COOK',
    'PUBLICATION_MEALS',
    'PUBLICATION_MENUS',
    'WHATSAPP_ENGLISH_TEMPLATES',
] as const;

export type FeatureToggleKey = (typeof featureToggleKeys)[number];

export function featureToggleIsActive(activeKeys: readonly FeatureToggleKey[], key: FeatureToggleKey): boolean {
    return activeKeys.includes(key);
}
