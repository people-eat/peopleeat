import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { cookieSettings } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionCookieSettingAcceptAll } from './sessionCookieSettingAcceptAll';
import { sessionCookieSettingAcceptMandatory } from './sessionCookieSettingAcceptMandatory';

describe('sessionCookieSettingAcceptAll', () => {
    it('inserts GA + Clarity true and publishes sessionUpdates', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();

        const result = await sessionCookieSettingAcceptAll(requestingSession, serverRuntime);

        expect(result).toEqual({ success: true, referenceId: requestingSession.sessionId });
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({ sessionId: requestingSession.sessionId });

        const [row] = await testDb.select().from(cookieSettings).where(eq(cookieSettings.sessionId, requestingSession.sessionId));
        expect(row).toMatchObject({
            sessionId: requestingSession.sessionId,
            googleAnalytics: true,
            clarity: true,
        });
    });

    it('upserts over an existing mandatory-only row', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        await testDb.insert(cookieSettings).values({
            sessionId: requestingSession.sessionId,
            googleAnalytics: false,
            clarity: false,
        });

        const result = await sessionCookieSettingAcceptAll(requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(cookieSettings).where(eq(cookieSettings.sessionId, requestingSession.sessionId));
        expect(row).toMatchObject({ googleAnalytics: true, clarity: true });
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalled();
    });
});

describe('sessionCookieSettingAcceptMandatory', () => {
    it('inserts GA + Clarity false and publishes sessionUpdates', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();

        const result = await sessionCookieSettingAcceptMandatory(requestingSession, serverRuntime);

        expect(result).toEqual({ success: true, referenceId: requestingSession.sessionId });
        expect(vi.mocked(serverRuntime.publish.sessionUpdates)).toHaveBeenCalledWith({
            sessionId: requestingSession.sessionId,
        });

        const [row] = await testDb.select().from(cookieSettings).where(eq(cookieSettings.sessionId, requestingSession.sessionId));
        expect(row).toMatchObject({
            sessionId: requestingSession.sessionId,
            googleAnalytics: false,
            clarity: false,
        });
    });

    it('upserts over an existing accept-all row', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        await testDb.insert(cookieSettings).values({
            sessionId: requestingSession.sessionId,
            googleAnalytics: true,
            clarity: true,
        });

        const result = await sessionCookieSettingAcceptMandatory(requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(cookieSettings).where(eq(cookieSettings.sessionId, requestingSession.sessionId));
        expect(row).toMatchObject({ googleAnalytics: false, clarity: false });
    });
});
