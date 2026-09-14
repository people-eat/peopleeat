import { describe, expect, it } from 'vitest';

import { isSessionEventKey, isSessionEventKeyNoLongerProduced, sessionEventKeysNoLongerProduced } from './sessionEvent';

describe('sessionEvent taxonomy', () => {
    it('recognizes emitted and legacy keys', () => {
        expect(isSessionEventKey('AUTH_EMAIL_OTP_REQUESTED')).toBe(true);
        expect(isSessionEventKey('SIGN_IN_SUCCESSFUL')).toBe(true);
        expect(isSessionEventKey('NOT_A_REAL_KEY')).toBe(false);
    });

    it('marks password / legacy phone keys as no longer produced', () => {
        for (const key of sessionEventKeysNoLongerProduced) {
            expect(isSessionEventKey(key)).toBe(true);
            expect(isSessionEventKeyNoLongerProduced(key)).toBe(true);
        }
        expect(isSessionEventKeyNoLongerProduced('AUTH_EMAIL_OTP_REQUESTED')).toBe(false);
        expect(isSessionEventKeyNoLongerProduced('USER_CREATE_SUCCESSFUL')).toBe(false);
        expect(isSessionEventKeyNoLongerProduced('NEWSLETTER_SUBSCRIPTION_CREATED')).toBe(false);
    });
});
