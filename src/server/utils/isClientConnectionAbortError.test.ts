import { describe, expect, it } from 'vitest';

import { isClientConnectionAbortError } from './isClientConnectionAbortError';

describe('isClientConnectionAbortError', () => {
    it('matches Node abortIncoming ECONNRESET', () => {
        const error = Object.assign(new Error('aborted'), { code: 'ECONNRESET' });
        expect(isClientConnectionAbortError(error)).toBe(true);
    });

    it('matches AbortError by name', () => {
        const error = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
        expect(isClientConnectionAbortError(error)).toBe(true);
    });

    it('matches EPIPE and premature close', () => {
        expect(isClientConnectionAbortError(Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }))).toBe(true);
        expect(isClientConnectionAbortError(Object.assign(new Error('Premature close'), { code: 'ERR_STREAM_PREMATURE_CLOSE' }))).toBe(
            true,
        );
    });

    it('matches nested cause', () => {
        const cause = Object.assign(new Error('aborted'), { code: 'ECONNRESET' });
        expect(isClientConnectionAbortError(new Error('request failed', { cause }))).toBe(true);
    });

    it('rejects unrelated errors', () => {
        expect(isClientConnectionAbortError(new Error('boom'))).toBe(false);
        expect(isClientConnectionAbortError(Object.assign(new Error('connect ECONNRESET'), { code: 'ECONNRESET' }))).toBe(false);
        expect(isClientConnectionAbortError(null)).toBe(false);
        expect(isClientConnectionAbortError('aborted')).toBe(false);
    });
});
