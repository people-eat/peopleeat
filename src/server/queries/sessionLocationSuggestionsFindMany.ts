import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSLocationSuggestion, GqlSSession, GqlSSessionLocationSuggestionsArgs } from '../graphql/generated';
import { toGqlLocationSuggestion } from '../mappers/toGqlLocationSuggestion';

export async function sessionLocationSuggestionsFindMany(
    args: GqlSSessionLocationSuggestionsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSLocationSuggestion[]> {
    try {
        const suggestions = await serverRuntime.places.locationSuggestions({
            searchText: args.searchText,
            sessionToken: requestingSession.sessionId,
            onlyFullAddresses: args.onlyFullAddresses,
        });
        return suggestions.map(toGqlLocationSuggestion);
    } catch (error) {
        // Never fail the page over Places — empty list + log.
        serverRuntime.log.error(error, requestingSession);
        return [];
    }
}
