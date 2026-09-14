import { describe, expect, it, vi } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { sessionLocationSuggestionsFindMany } from './sessionLocationSuggestionsFindMany';

describe('sessionLocationSuggestionsFindMany', () => {
    it('maps Places suggestions and forwards the search args', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        vi.mocked(serverRuntime.places.locationSuggestions).mockResolvedValue([
            {
                displayText: 'Berlin, Germany',
                latitude: 52.52,
                longitude: 13.405,
                structuredAddress: {
                    addressLine1: 'Unter den Linden',
                    addressLine2: '',
                    city: 'Berlin',
                    postCode: '10117',
                    state: 'Berlin',
                    country: 'Germany',
                },
            },
        ]);

        // Act
        const result = await sessionLocationSuggestionsFindMany(
            { searchText: 'Berlin', onlyFullAddresses: true },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(serverRuntime.places.locationSuggestions).toHaveBeenCalledWith({
            searchText: 'Berlin',
            sessionToken: requestingSession.sessionId,
            onlyFullAddresses: true,
        });
        expect(result).toEqual([
            {
                displayText: 'Berlin, Germany',
                latitude: 52.52,
                longitude: 13.405,
                structuredAddress: {
                    displayText: 'Berlin, Germany',
                    latitude: 52.52,
                    longitude: 13.405,
                    addressLine1: 'Unter den Linden',
                    addressLine2: '',
                    city: 'Berlin',
                    postCode: '10117',
                    state: 'Berlin',
                    country: 'Germany',
                },
            },
        ]);
    });

    it('returns an empty list and logs when Places throws', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        vi.mocked(serverRuntime.places.locationSuggestions).mockRejectedValue(new Error('places down'));

        // Act
        const result = await sessionLocationSuggestionsFindMany(
            { searchText: 'x', onlyFullAddresses: false },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual([]);
    });
});
