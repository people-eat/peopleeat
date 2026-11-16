import { describe, expect, it } from 'vitest';

import { catalogLoaders } from './catalogLoaders';
import { I18N_WEB_NAMESPACES } from './namespaces';

describe('catalogLoaders', () => {
    it('maps every web namespace to an explicit per-locale dynamic import', () => {
        expect(Object.keys(catalogLoaders).sort()).toEqual([...I18N_WEB_NAMESPACES].sort());
        for (const namespace of I18N_WEB_NAMESPACES) {
            expect(Object.keys(catalogLoaders[namespace]).sort()).toEqual(['de', 'en', 'fr', 'it', 'nl', 'ru']);
        }
    });

    it('does not expose an email loader on the web map', () => {
        expect('email' in catalogLoaders).toBe(false);
    });
});
