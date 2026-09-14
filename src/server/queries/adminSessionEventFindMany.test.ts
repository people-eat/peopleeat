import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { sessionEvents } from '../db/schema';
import { commandSetup } from '../test/commandTestUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { adminAnalyticsBookingRequestFormFlow } from './adminAnalyticsBookingRequestFormFlow';
import { adminSessionEventFindMany } from './adminSessionEventFindMany';
import { adminSessionEventWebPageVisitCreationsFindMany } from './adminSessionEventWebPageVisitCreationsFindMany';

describe('adminSessionEventFindMany', () => {
    it('returns events for a session chronologically when requested', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'events-admin', lastName: 'User' });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'LANDING', path: '/' },
        });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_completed', step: 'occasion' },
            },
        });

        // Act
        const events = await adminSessionEventFindMany(
            { sessionIds: [setup.requestingSession.sessionId], userIds: null, types: null, skip: 0, take: 50 },
            setup.requestingSession,
            setup.serverRuntime,
            { chronological: true },
        );

        // Assert
        expect(events.length).toBeGreaterThanOrEqual(2);
        expect(events[0]?.type).toBe('WEB_PAGE_VISITED');
        expect(events.at(-1)?.type).toBe('WEB_PAGE_INTERACTION');
    });

    it('requires sessionIds or userIds', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'events-admin-empty', lastName: 'User' });

        // Act / Assert
        await expect(
            adminSessionEventFindMany(
                { sessionIds: null, userIds: null, types: null, skip: 0, take: 10 },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(/sessionIds or userIds required/);
    });
});

describe('adminAnalyticsBookingRequestFormFlow', () => {
    it('returns sankey nodes and links for completed funnel steps', async () => {
        // Arrange
        const setup = await commandSetup();
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_entered', step: 'occasion' },
            },
        });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_completed', step: 'occasion' },
            },
        });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_entered', step: 'participants' },
            },
        });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_completed', step: 'participants' },
            },
        });
        const startDateTime = new Date(Date.now() - 60_000);
        const endDateTime = new Date(Date.now() + 60_000);

        // Act
        const flow = await adminAnalyticsBookingRequestFormFlow(
            { startDateTime, endDateTime },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(flow.nodes.some((node) => node.id === 'occasion')).toBe(true);
        expect(flow.nodes.some((node) => node.id === 'participants')).toBe(true);
        expect(flow.links.some((link) => link.source === 'occasion' && link.target === 'participants' && link.value >= 1)).toBe(true);
        expect(flow.sessionsWithCompletion).toBeGreaterThanOrEqual(1);
        const occasion = flow.steps.find((step) => step.id === 'occasion');
        expect(occasion?.enteredCount).toBeGreaterThanOrEqual(1);
        expect(occasion?.completedCount).toBeGreaterThanOrEqual(1);
    });

    it('returns nodes without links for a single completed step', async () => {
        // Arrange — unique window so leftover DB rows from other runs cannot add edges.
        const setup = await commandSetup();
        const sessionId = setup.requestingSession.sessionId;
        await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_completed', step: 'occasion' },
            },
        });
        const startMs = Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 1e12);
        const startDateTime = new Date(startMs);
        const endDateTime = new Date(startMs + 86_400_000);
        await setup.serverRuntime.db
            .update(sessionEvents)
            .set({ createdAt: new Date(startMs + 3_600_000) })
            .where(eq(sessionEvents.sessionId, sessionId));

        // Act
        const flow = await adminAnalyticsBookingRequestFormFlow(
            { startDateTime, endDateTime },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(flow.nodes).toEqual([{ id: 'occasion', labelDe: 'Anlass', labelEn: 'Occasion' }]);
        expect(flow.links).toHaveLength(0);
        expect(flow.steps.find((step) => step.id === 'occasion')?.completedCount).toBe(1);
        expect(flow.sessionsWithCompletion).toBe(1);
        expect(flow.bookingRequestsCreated).toBe(0);
    });

    it('drops backward step edges so the Sankey stays a DAG', async () => {
        // Arrange — unique window; session goes forward then back (form edit).
        const setup = await commandSetup();
        const sessionId = setup.requestingSession.sessionId;
        const startMs = Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 1e12);
        const startDateTime = new Date(startMs);
        const endDateTime = new Date(startMs + 86_400_000);
        const stepSequence = ['occasion', 'participants', 'occasion', 'participants'] as const;
        const eventIds: string[] = [];
        for (const step of stepSequence) {
            const created = await sessionEventCreate(setup.serverRuntime, {
                sessionId,
                type: 'WEB_PAGE_INTERACTION',
                payload: {
                    webPageKey: 'BOOKING_REQUEST_FORM',
                    area: 'booking_request_form',
                    interaction: { type: 'step_completed', step },
                },
            });
            eventIds.push(created.sessionEventId);
        }
        for (const [index, sessionEventId] of eventIds.entries()) {
            await setup.serverRuntime.db
                .update(sessionEvents)
                .set({ createdAt: new Date(startMs + (index + 1) * 1_000) })
                .where(eq(sessionEvents.sessionEventId, sessionEventId));
        }

        // Act
        const flow = await adminAnalyticsBookingRequestFormFlow(
            { startDateTime, endDateTime },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert — forward occasion→participants kept; backward participants→occasion dropped.
        expect(flow.links.some((link) => link.source === 'occasion' && link.target === 'participants')).toBe(true);
        expect(flow.links.some((link) => link.source === 'participants' && link.target === 'occasion')).toBe(false);
    });

    it('counts entered and completed separately and tracks created', async () => {
        // Arrange — unique window so leftover DB rows from other runs cannot inflate counts.
        const setup = await commandSetup();
        const sessionId = setup.requestingSession.sessionId;
        await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_entered', step: 'message' },
            },
        });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_completed', step: 'message' },
            },
        });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'BOOKING_REQUEST_CREATED',
            payload: { bookingRequestId: 'brTestAnalytics0001' },
        });
        const startMs = Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 1e12);
        const startDateTime = new Date(startMs);
        const endDateTime = new Date(startMs + 86_400_000);
        // Distinct timestamps: Sankey edges follow createdAt order within a session.
        await setup.serverRuntime.db
            .update(sessionEvents)
            .set({ createdAt: new Date(startMs + 3_600_000) })
            .where(eq(sessionEvents.sessionId, sessionId));
        await setup.serverRuntime.db
            .update(sessionEvents)
            .set({ createdAt: new Date(startMs + 3_600_000 + 1_000) })
            .where(and(eq(sessionEvents.sessionId, sessionId), eq(sessionEvents.type, 'BOOKING_REQUEST_CREATED')));

        // Act
        const flow = await adminAnalyticsBookingRequestFormFlow(
            { startDateTime, endDateTime },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const message = flow.steps.find((step) => step.id === 'message');
        const created = flow.steps.find((step) => step.id === 'created');
        expect(message?.enteredCount).toBe(1);
        expect(message?.completedCount).toBe(1);
        expect(created?.enteredCount).toBe(0);
        expect(created?.completedCount).toBe(1);
        expect(flow.bookingRequestsCreated).toBe(1);
        expect(flow.links.some((link) => link.source === 'message' && link.target === 'created')).toBe(true);
    });
});

describe('adminSessionEventWebPageVisitCreationsFindMany', () => {
    it('returns a zero-filled day series', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'visit-buckets-admin', lastName: 'User' });
        const startDateTime = new Date(Date.UTC(2026, 7, 1));
        const endDateTime = new Date(Date.UTC(2026, 7, 3));

        // Act
        const series = await adminSessionEventWebPageVisitCreationsFindMany(
            'LANDING',
            { startDateTime, endDateTime },
            'day',
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(series).toHaveLength(3);
        expect(series.every((bucket) => bucket.count >= 0)).toBe(true);
    });
});
