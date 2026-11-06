/**
 * Offer addon domain types — admin templates, cook library / offer copies,
 * and pricing units. See docs/features/booking-offer-addons.md.
 */

export const offerAddonPricingUnits = ['FLAT', 'PER_PERSON'] as const;
export type OfferAddonPricingUnit = (typeof offerAddonPricingUnits)[number];

export const offerAddonInclusions = ['OPTIONAL', 'REQUIRED'] as const;
export type OfferAddonInclusion = (typeof offerAddonInclusions)[number];
