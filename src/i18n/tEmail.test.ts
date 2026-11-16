import { describe, expect, it } from 'vitest';

import { tEmail, tEmailAsync, tEmailReady } from './tEmail';

describe('tEmail', () => {
    it('loads the email catalog without throwing', async () => {
        await tEmailReady('de');
        expect(tEmail('de', 'missing.key')).toBe('');
    });

    it('returns the OTP subject for german and english', async () => {
        await tEmailReady('de');
        await tEmailReady('en');
        expect(tEmail('de', 'auth.otp.subject', { code: '123456' })).toBe('Dein peopleeat Anmeldecode: 123456');
        expect(await tEmailAsync('en', 'auth.otp.subject', { code: '123456' })).toBe('Your peopleeat sign-in code: 123456');
    });
});
