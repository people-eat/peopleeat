import { describe, expect, it } from 'vitest';

import { cookieSettings } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionCookieSettingFindOne } from './sessionCookieSettingFindOne';

describe('sessionCookieSettingFindOne', () => {
    it('returns null when the session has no CookieSettings row', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();

        const result = await sessionCookieSettingFindOne(requestingSession, serverRuntime);

        expect(result).toBeNull();
    });

    it('returns the mapped consent flags when a row exists', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        await testDb.insert(cookieSettings).values({
            sessionId: requestingSession.sessionId,
            googleAnalytics: true,
            clarity: false,
        });

        const result = await sessionCookieSettingFindOne(requestingSession, serverRuntime);

        expect(result).toEqual({ googleAnalytics: true, clarity: false });
    });
});
