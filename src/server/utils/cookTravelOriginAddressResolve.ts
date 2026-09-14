import type { CookTravelOriginAddress } from '../domain/cook';
import type { Places } from '../places/Places';

/** Resolves a Places `displayText` into the structured cook travel-origin payload. */
export async function cookTravelOriginAddressResolve({
    exactTravelOriginAddress,
    sessionToken,
    places,
    errorPrefix,
}: {
    exactTravelOriginAddress: string;
    sessionToken: string;
    places: Places;
    errorPrefix: string;
}): Promise<CookTravelOriginAddress> {
    const trimmed = exactTravelOriginAddress.trim();
    if (trimmed.length === 0) {
        throw new Error(`${errorPrefix}: exactTravelOriginAddress must not be empty`);
    }
    const [location] = await places.locationSuggestions({
        searchText: trimmed,
        sessionToken,
        onlyFullAddresses: true,
    });
    if (!location?.structuredAddress) {
        throw new Error(`${errorPrefix}: exactTravelOriginAddress must be a full address`);
    }
    return {
        displayText: location.displayText,
        latitude: location.latitude,
        longitude: location.longitude,
        addressLine1: location.structuredAddress.addressLine1,
        addressLine2: location.structuredAddress.addressLine2,
        city: location.structuredAddress.city,
        postCode: location.structuredAddress.postCode,
        state: location.structuredAddress.state,
        country: location.structuredAddress.country,
    };
}
