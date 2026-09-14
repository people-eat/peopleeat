import type { UserStatus } from './user';

export type CookStripeStatus = 'EMPTY' | 'PREPARED' | 'COMPLETED' | 'ACTIVE_WAS_RESET';

/** Exception kind for cook call availability — BLOCK removes a window; OPEN adds an ad-hoc window. */
export type CookCallAvailabilityExceptionType = 'BLOCK' | 'OPEN';

export type CookTravelOriginAddress = {
    displayText: string;
    latitude: number;
    longitude: number;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postCode: string;
    state: string;
    country: string;
};

export type CookStripeColumns = {
    stripeAccountId: string | null;
    stripeAccountActive: boolean;
    stripeAccountActiveWasReset: boolean;
};

export function cookStripeStatusDerive(cook: CookStripeColumns): CookStripeStatus {
    if (!cook.stripeAccountId) {
        return 'EMPTY';
    }
    if (cook.stripeAccountActiveWasReset) {
        return 'ACTIVE_WAS_RESET';
    }
    if (cook.stripeAccountActive) {
        return 'COMPLETED';
    }
    return 'PREPARED';
}

export function cookCanCreateOffersDerive(cook: { isApprovedByAdmin: boolean } & CookStripeColumns, userStatus: UserStatus): boolean {
    return userStatus === 'ACTIVE' && cook.isApprovedByAdmin && cookStripeStatusDerive(cook) === 'COMPLETED';
}
