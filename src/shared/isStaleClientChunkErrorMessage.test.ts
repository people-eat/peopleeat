import { describe, expect, it } from 'vitest';

import { isStaleClientChunkErrorMessage } from './isStaleClientChunkErrorMessage';

describe('isStaleClientChunkErrorMessage', () => {
    it('matches Chromium Failed to fetch dynamically imported module', () => {
        expect(
            isStaleClientChunkErrorMessage(
                'Failed to fetch dynamically imported module: https://people-eat.com/assets/ImageCropDialog-DiR9vtaz.js',
            ),
        ).toBe(true);
    });

    it('matches Safari / WebKit error loading dynamically imported module', () => {
        expect(
            isStaleClientChunkErrorMessage(
                'error loading dynamically imported module: https://people-eat.com/assets/ImageCropDialog-DiR9vtaz.js',
            ),
        ).toBe(true);
    });

    it('matches Firefox Importing a module script failed', () => {
        expect(isStaleClientChunkErrorMessage('Importing a module script failed.')).toBe(true);
    });

    it('matches Vite unable to preload CSS', () => {
        expect(isStaleClientChunkErrorMessage('Unable to preload CSS for /assets/foo-abc.css')).toBe(true);
    });

    it('rejects unrelated application errors', () => {
        expect(isStaleClientChunkErrorMessage('Unauthorized')).toBe(false);
        expect(isStaleClientChunkErrorMessage('Failed to fetch')).toBe(false);
        expect(isStaleClientChunkErrorMessage('Load failed')).toBe(false);
        expect(isStaleClientChunkErrorMessage('')).toBe(false);
        expect(isStaleClientChunkErrorMessage('   ')).toBe(false);
    });
});
