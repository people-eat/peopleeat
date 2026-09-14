import type { Page } from '@playwright/test';

/**
 * Stub Google Places for the city-center combobox. CI has no Places key; booking
 * create e2e skips Places via URL draft — city create has no equivalent, so mock
 * only `AdminCitiesPageLocationSuggestions` and continue everything else.
 */
export async function cityCenterSuggestionsMock(page: Page, suggestion = berlinCityCenterSuggestion): Promise<void> {
    await page.route('**/api/graphql', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') {
            await route.continue();
            return;
        }
        let body: { operationName?: string } | undefined;
        try {
            body = request.postDataJSON() as { operationName?: string };
        } catch {
            await route.continue();
            return;
        }
        if (body.operationName !== 'AdminCitiesPageLocationSuggestions') {
            await route.continue();
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                data: {
                    currentSession: {
                        locationSuggestions: [
                            {
                                displayText: suggestion.displayText,
                                latitude: suggestion.latitude,
                                longitude: suggestion.longitude,
                                structuredAddress: { city: suggestion.city },
                            },
                        ],
                    },
                },
            }),
        });
    });
}

export const berlinCityCenterSuggestion = {
    displayText: 'Berlin, Germany',
    latitude: 52.52,
    longitude: 13.405,
    city: 'Berlin',
} as const;
