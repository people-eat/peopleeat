import { describe, expect, it } from 'vitest';

import { sessionSwitchUrl } from './sessionSwitchUrl';

describe('sessionSwitchUrl', () => {
    it('builds a relative switch URL with encoded redirect', () => {
        expect(sessionSwitchUrl('abcDEFghij1234567890', '/en/profile')).toBe(
            '/api/session/switch?toSessionId=abcDEFghij1234567890&redirect=%2Fen%2Fprofile',
        );
    });
});
