export type PlacesStructuredAddress = {
    addressLine1: string;
    addressLine2: string;
    city: string;
    postCode: string;
    state: string;
    country: string;
};

export type PlacesLocationSuggestion = {
    displayText: string;
    latitude: number;
    longitude: number;
    structuredAddress?: PlacesStructuredAddress;
};

type PlacesGeoCoordinates = {
    latitude: number;
    longitude: number;
};

export interface Places {
    locationSuggestions: (options: {
        searchText: string;
        sessionToken: string;
        onlyFullAddresses?: boolean;
    }) => Promise<PlacesLocationSuggestion[]>;
    geoCoordinatesForCity: (options: {
        city: string;
        postCode?: string;
        country?: string;
        sessionToken: string;
    }) => Promise<PlacesGeoCoordinates>;
    /**
     * Google Routes API driving distance in km, or `null` when the API fails /
     * returns no route. Callers fall back to haversine via `travelDistanceKmResolve`.
     */
    drivingDistanceKm: (options: { origin: PlacesGeoCoordinates; destination: PlacesGeoCoordinates }) => Promise<number | null>;
}
