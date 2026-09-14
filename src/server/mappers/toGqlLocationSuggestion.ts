import type { GqlSLocationSuggestion } from '../graphql/generated';
import type { PlacesLocationSuggestion } from '../places/Places';

export function toGqlLocationSuggestion(suggestion: PlacesLocationSuggestion): GqlSLocationSuggestion {
    return {
        displayText: suggestion.displayText,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        structuredAddress: suggestion.structuredAddress
            ? {
                  displayText: suggestion.displayText,
                  latitude: suggestion.latitude,
                  longitude: suggestion.longitude,
                  addressLine1: suggestion.structuredAddress.addressLine1,
                  addressLine2: suggestion.structuredAddress.addressLine2,
                  city: suggestion.structuredAddress.city,
                  postCode: suggestion.structuredAddress.postCode,
                  state: suggestion.structuredAddress.state,
                  country: suggestion.structuredAddress.country,
              }
            : null,
    };
}
