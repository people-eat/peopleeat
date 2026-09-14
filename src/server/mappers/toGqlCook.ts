import type { Cook } from '../db/schema';
import type { BookingRequestExactEventAddress } from '../domain/bookingRequest';
import { cookCanCreateOffersDerive, cookStripeStatusDerive } from '../domain/cook';
import type { UserStatus } from '../domain/user';
import type { GqlSCook, GqlSCookTravelOriginAddress, GqlSPublicCookRating } from '../graphql/generated';

export function toGqlCookTravelOriginAddress(address: NonNullable<Cook['exactTravelOriginAddress']>): GqlSCookTravelOriginAddress {
    return {
        displayText: address.displayText,
        latitude: address.latitude,
        longitude: address.longitude,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        postCode: address.postCode,
        state: address.state,
        country: address.country,
    };
}

/**
 * Cook-facing event venue. Street fields stay empty until dual-accept
 * (`revealExact`); pool / negotiating offers only get post code + city + country.
 */
export function toGqlCookEventAddress(
    address: BookingRequestExactEventAddress,
    options: { revealExact: boolean },
): GqlSCookTravelOriginAddress {
    if (options.revealExact) {
        return toGqlCookTravelOriginAddress(address);
    }

    const cityLine = [address.postCode, address.city]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ');
    const displayText = cityLine.length > 0 ? cityLine : address.city.trim() || address.country.trim();

    return {
        displayText,
        latitude: address.latitude,
        longitude: address.longitude,
        addressLine1: '',
        addressLine2: '',
        city: address.city,
        postCode: address.postCode,
        state: address.state,
        country: address.country,
    };
}

export function toGqlCook(row: Cook, userStatus: UserStatus): GqlSCook {
    return {
        cookId: row.cookId,
        isVisible: row.isVisible,
        isApprovedByAdmin: row.isApprovedByAdmin,
        canCreateOffers: cookCanCreateOffersDerive(row, userStatus),
        stripeStatus: cookStripeStatusDerive(row),
        // Field resolver loads a live Stripe snapshot for the wallet page.
        stripeAccountDetails: null,
        // Field resolver loads live Connect balance + transactions for the wallet page.
        stripeWallet: null,
        stageName: row.stageName ?? null,
        exactTravelOriginAddress: row.exactTravelOriginAddress ? toGqlCookTravelOriginAddress(row.exactTravelOriginAddress) : null,
        biography: row.biography,
        biographySummary: row.biographySummary,
        // Field resolver derives live pg-boss state (deterministic job id).
        biographySummaryGenerating: false,
        // Field resolver loads FileUpload when `logoFileUploadId` is set.
        logo: null,
        cuisineStyle: row.cuisineStyle ?? null,
        cookingPhilosophy: row.cookingPhilosophy ?? null,
        // Field resolver populates from published customer testimonials.
        rating: undefined as unknown as GqlSPublicCookRating,
        travelExpensesAmount: row.travelExpensesAmount,
        maximumTravelDistance: row.maximumTravelDistance ?? null,
        minimumPriceAmount: row.minimumPriceAmount ?? null,
        maximumPriceAmount: row.maximumPriceAmount ?? null,
        minimumParticipants: row.minimumParticipants ?? null,
        maximumParticipants: row.maximumParticipants ?? null,
        callSchedulingEnabled: row.callSchedulingEnabled,
        callDurationMinutes: row.callDurationMinutes,
        // Field resolvers populate nested lists from the session cook id.
        callAvailabilityRules: [],
        callAvailabilityExceptions: [],
        callSlots: [],
        callSlotBookings: [],
        meals: [],
        mealsCounts: [],
        menus: [],
        offerMenus: [],
        menusCounts: [],
        bookingRequests: [],
        // Field resolver populates; NotFound is the leak-safe default stub.
        bookingRequestLookup: { gqlTypeName: 'CookBookingRequestNotFound', _: null },
        bookingRequestOffers: [],
        lastModifiedAt: row.lastModifiedAt,
    };
}
