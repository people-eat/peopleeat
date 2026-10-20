import { describe, expect, it } from 'vitest';

import { isBenignClientNetworkErrorMessage } from './isBenignClientNetworkErrorMessage';

describe('isBenignClientNetworkErrorMessage', () => {
    it('matches Safari Load failed', () => {
        expect(isBenignClientNetworkErrorMessage('Load failed')).toBe(true);
    });

    it('matches Chromium Failed to fetch and URQL [Network] prefix', () => {
        expect(isBenignClientNetworkErrorMessage('Failed to fetch')).toBe(true);
        expect(isBenignClientNetworkErrorMessage('[Network] Failed to fetch')).toBe(true);
    });

    it('matches Firefox and abort wording', () => {
        expect(isBenignClientNetworkErrorMessage('NetworkError when attempting to fetch resource.')).toBe(true);
        expect(isBenignClientNetworkErrorMessage('The user aborted a request.')).toBe(true);
        expect(isBenignClientNetworkErrorMessage('The operation was aborted.')).toBe(true);
    });

    it('rejects real application errors', () => {
        expect(isBenignClientNetworkErrorMessage('Unauthorized')).toBe(false);
        expect(isBenignClientNetworkErrorMessage('Internal server error')).toBe(false);
        expect(isBenignClientNetworkErrorMessage('Variable "$id" of required type "ID!" was not provided.')).toBe(false);
        expect(isBenignClientNetworkErrorMessage('')).toBe(false);
        expect(isBenignClientNetworkErrorMessage('   ')).toBe(false);
    });
});
