import type { Places, PlacesLocationSuggestion, PlacesStructuredAddress } from './Places';

type PlacesSearchResponse = {
    places?: Place[];
};

type Place = {
    addressComponents?: AddressComponent[];
    location?: { latitude?: number; longitude?: number };
};

type AddressComponent = {
    longText?: string;
    shortText?: string;
    types?: string[];
};

function addressComponentGet(components: AddressComponent[] | undefined, type: string): string | undefined {
    return components?.find((component) => component.types?.includes(type))?.longText;
}

function addressComponentShortGet(components: AddressComponent[] | undefined, type: string): string | undefined {
    return components?.find((component) => component.types?.includes(type))?.shortText;
}

function fullPostalCodeOnlyGet(components: AddressComponent[] | undefined): string | undefined {
    const match = components?.find((component) => component.types?.includes('postal_code'));
    if (!match || match.types?.includes('postal_code_prefix')) {
        return undefined;
    }
    return match.longText;
}

function hasType(components: AddressComponent[] | undefined, type: string): boolean {
    return Boolean(addressComponentGet(components, type));
}

function hasFullAddress(components: AddressComponent[] | undefined): boolean {
    if (!components?.length) {
        return false;
    }
    return (
        hasType(components, 'route') &&
        hasType(components, 'street_number') &&
        Boolean(fullPostalCodeOnlyGet(components)) &&
        hasType(components, 'locality') &&
        hasType(components, 'country')
    );
}

function addressDisplayTitleBuild(components: AddressComponent[], cityName: string): string {
    const route = addressComponentGet(components, 'route');
    const streetNumber = addressComponentGet(components, 'street_number');
    const postalCode = fullPostalCodeOnlyGet(components);
    const country = addressComponentGet(components, 'country');
    const streetLine = route && streetNumber ? `${route} ${streetNumber}` : (route ?? streetNumber);
    const cityLine = postalCode ? `${postalCode} ${cityName}` : cityName;
    const countryPart = country ? `, ${country}` : '';
    if (streetLine) {
        return `${streetLine}, ${cityLine}${countryPart}`;
    }
    return `${cityLine}${countryPart}`;
}

function structuredAddressBuild(components: AddressComponent[], cityName: string): PlacesStructuredAddress {
    const route = addressComponentGet(components, 'route');
    const streetNumber = addressComponentGet(components, 'street_number');
    return {
        addressLine1: route && streetNumber ? `${route} ${streetNumber}` : (route ?? streetNumber ?? ''),
        addressLine2: addressComponentGet(components, 'subpremise') ?? '',
        city: cityName,
        postCode: fullPostalCodeOnlyGet(components) ?? '',
        state: addressComponentGet(components, 'administrative_area_level_1') ?? '',
        country: addressComponentShortGet(components, 'country') ?? addressComponentGet(components, 'country') ?? '',
    };
}

export function placeToLocationSuggestion(place: Place): PlacesLocationSuggestion | null {
    const components = place.addressComponents ?? [];
    const cityName =
        addressComponentGet(components, 'locality') ??
        addressComponentGet(components, 'sublocality') ??
        addressComponentGet(components, 'administrative_area_level_2');
    const latitude = place.location?.latitude;
    const longitude = place.location?.longitude;
    if (!cityName || latitude === undefined || longitude === undefined) {
        return null;
    }
    const structuredAddress = hasFullAddress(components) ? structuredAddressBuild(components, cityName) : undefined;
    return {
        displayText: addressDisplayTitleBuild(components, cityName),
        latitude,
        longitude,
        ...(structuredAddress ? { structuredAddress } : {}),
    };
}

export function placesCreate(options: { apiKey: string }): Places {
    async function locationSuggestionsFetch(searchText: string): Promise<PlacesLocationSuggestion[]> {
        const apiKey = options.apiKey;
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.addressComponents,places.location',
            },
            body: JSON.stringify({
                textQuery: searchText,
                languageCode: 'de',
                regionCode: 'DE',
            }),
        });
        if (!response.ok) {
            throw new Error(`places.locationSuggestions: Google Places HTTP ${response.status}`);
        }
        const data = (await response.json()) as PlacesSearchResponse;
        return (data.places ?? [])
            .map(placeToLocationSuggestion)
            .filter((suggestion): suggestion is PlacesLocationSuggestion => suggestion !== null);
    }

    return {
        async locationSuggestions({ searchText, onlyFullAddresses }) {
            const trimmed = searchText.trim();
            if (trimmed.length === 0) {
                return [];
            }
            const suggestions = await locationSuggestionsFetch(trimmed);
            if (onlyFullAddresses) {
                return suggestions.filter((suggestion) => suggestion.structuredAddress !== undefined);
            }
            return suggestions;
        },
        async geoCoordinatesForCity({ city, postCode, country }) {
            let searchText = city;
            if (postCode) {
                searchText = `${postCode} ${searchText}`;
            }
            if (country) {
                searchText = `${searchText}, ${country}`;
            }
            const [first] = await locationSuggestionsFetch(searchText);
            if (!first) {
                throw new Error('places.geoCoordinatesForCity: no results');
            }
            return { latitude: first.latitude, longitude: first.longitude };
        },
        async drivingDistanceKm({ origin, destination }) {
            try {
                const apiKey = options.apiKey;
                const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'routes.distanceMeters',
                    },
                    body: JSON.stringify({
                        origin: {
                            location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } },
                        },
                        destination: {
                            location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } },
                        },
                        travelMode: 'DRIVE',
                    }),
                });
                if (!response.ok) {
                    return null;
                }
                const data = (await response.json()) as { routes?: { distanceMeters?: number }[] };
                const distanceMeters = data.routes?.[0]?.distanceMeters;
                if (typeof distanceMeters !== 'number') {
                    return null;
                }
                return distanceMeters / 1000;
            } catch {
                return null;
            }
        },
    };
}
