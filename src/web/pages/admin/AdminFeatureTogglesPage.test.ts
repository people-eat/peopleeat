import { describe, expect, it } from 'vitest';

import { adminFeatureTogglesSearchForUrl, parseAdminFeatureTogglesSearch } from './AdminFeatureTogglesPage';

describe('parseAdminFeatureTogglesSearch', () => {
    it('parses filters and omits defaults from the URL shape', () => {
        expect(
            parseAdminFeatureTogglesSearch({
                q: ' assistant ',
                status: 'enabled',
                config: 'configured',
                overrides: 'with-overrides',
                sort: 'updated-desc',
            }),
        ).toEqual({
            q: 'assistant',
            status: 'enabled',
            config: 'configured',
            overrides: 'with-overrides',
            sort: 'updated-desc',
        });

        expect(parseAdminFeatureTogglesSearch({ q: '   ', status: 'nope', sort: 'label-asc' })).toEqual({
            q: undefined,
            status: undefined,
            config: undefined,
            overrides: undefined,
            sort: undefined,
        });

        expect(
            adminFeatureTogglesSearchForUrl({
                q: 'x',
                status: 'disabled',
            }),
        ).toEqual({
            q: 'x',
            status: 'disabled',
            config: undefined,
            overrides: undefined,
            sort: undefined,
        });
    });
});
