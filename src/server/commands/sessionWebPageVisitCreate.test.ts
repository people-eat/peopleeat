import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cooks, sessionEvents, sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionWebPageVisitCreate } from './sessionWebPageVisitCreate';

describe('sessionWebPageVisitCreate', () => {
    it('inserts a WEB_PAGE_VISITED event for the current session', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'LANDING',
                    path: '/',
                    cityId: null,
                    cookId: null,
                    blogPostId: null,
                    partnerId: null,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, result.referenceId!));
        expect(row).toMatchObject({
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'LANDING', path: '/' },
        });
    });

    it('soft-succeeds when the session is terminated', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        await testDb.update(sessions).set({ wasTerminatedAt: new Date() }).where(eq(sessions.sessionId, requestingSession.sessionId));

        // Act
        const result = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'LANDING',
                    path: '/',
                    cityId: null,
                    cookId: null,
                    blogPostId: null,
                    partnerId: null,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: null });
        const rows = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(0);
    });

    it('resolves a chef slug to the stable cookId', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const pathName = `chef-${user.userId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(cooks).values({
            cookId: user.userId,
            pathName,
            isVisible: true,
            isApprovedByAdmin: true,
        });

        const result = await sessionWebPageVisitCreate(
            {
                input: {
                    webPageKey: 'CHEFS',
                    path: `/chefs/${pathName}`,
                    cityId: null,
                    cookId: pathName,
                    blogPostId: null,
                    partnerId: null,
                    occasionId: null,
                    bookingRequestId: null,
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, result.referenceId!));
        expect(row?.payload).toMatchObject({
            webPageKey: 'CHEFS',
            path: `/chefs/${pathName}`,
            params: { cookId: user.userId },
        });
    });
});
