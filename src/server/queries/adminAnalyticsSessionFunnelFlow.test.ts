import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, sessionEvents, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import type { AdminAnalyticsSessionFunnelConfig } from './adminAnalyticsSessionFunnelFlow';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

function funnelConfigCreate(): AdminAnalyticsSessionFunnelConfig {
    return {
        area: `query_test_funnel_${idCreate()}`,
        steps: ['configure', 'auth', 'checkout', 'paid'],
        labels: {
            configure: 'Konfig DE',
            auth: 'Auth DE',
            checkout: 'Checkout DE',
            paid: 'Paid DE',
        },
        lifecycleTypes: [{ type: 'GIFT_CARD_PAYED', step: 'paid' }],
        excludeCooks: false,
    };
}

function windowCreate() {
    const startMs = Date.UTC(2400, 0, 1) + Math.floor(Math.random() * 1e12);
    return {
        range: { startDateTime: new Date(startMs), endDateTime: new Date(startMs + 86_400_000) },
        at(index: number) {
            return new Date(startMs + (index + 1) * 1_000);
        },
    };
}

async function stamp(sessionEventId: string, createdAt: Date) {
    await testDb.update(sessionEvents).set({ createdAt }).where(eq(sessionEvents.sessionEventId, sessionEventId));
}

async function recordStep(
    serverRuntime: ServerRuntime,
    sessionId: string,
    step: 'configure' | 'auth' | 'checkout',
    interactionType: 'step_entered' | 'step_completed',
    createdAt: Date,
    area: string,
) {
    const created = await sessionEventCreate(serverRuntime, {
        sessionId,
        type: 'WEB_PAGE_INTERACTION',
        payload: {
            webPageKey: 'GIFT_CARD',
            area,
            interaction: { type: interactionType, step },
        },
    });
    await stamp(created.sessionEventId, createdAt);
}

describe('adminAnalyticsSessionFunnelFlow', () => {
    it('counts entered and completed steps, forward links, and labels', async () => {
        // Arrange
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_entered', window.at(0), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(1), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'auth', 'step_entered', window.at(2), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'auth', 'step_completed', window.at(3), config.area);

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        // Assert
        expect(flow.steps.map((step) => step.id)).toEqual(['configure', 'auth', 'checkout', 'paid']);
        expect(flow.steps.find((step) => step.id === 'configure')).toMatchObject({
            label: 'Konfig DE',
            enteredCount: 1,
            completedCount: 1,
        });
        expect(flow.steps.find((step) => step.id === 'auth')).toMatchObject({ enteredCount: 1, completedCount: 1 });
        expect(flow.steps.find((step) => step.id === 'checkout')).toMatchObject({ enteredCount: 0, completedCount: 0 });
        expect(flow.nodes).toEqual([
            { id: 'configure', label: 'Konfig DE' },
            { id: 'auth', label: 'Auth DE' },
        ]);
        expect(flow.links).toEqual([{ source: 'configure', target: 'auth', value: 1 }]);
        expect(flow.sessionsWithCompletion).toBe(1);
        expect(flow.terminalCount).toBe(0);
    });

    it('counts step_entered without creating sankey nodes', async () => {
        // Arrange
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        await recordStep(setup.serverRuntime, setup.requestingSession.sessionId, 'configure', 'step_entered', window.at(0), config.area);

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        // Assert
        expect(flow.steps.find((step) => step.id === 'configure')).toMatchObject({ enteredCount: 1, completedCount: 0 });
        expect(flow.nodes).toEqual([]);
        expect(flow.links).toEqual([]);
        expect(flow.sessionsWithCompletion).toBe(0);
    });

    it('returns a node without links for a single completed step', async () => {
        // Arrange
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        await recordStep(setup.serverRuntime, setup.requestingSession.sessionId, 'configure', 'step_completed', window.at(0), config.area);

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        // Assert
        expect(flow.nodes).toEqual([{ id: 'configure', label: 'Konfig DE' }]);
        expect(flow.links).toEqual([]);
        expect(flow.steps.find((step) => step.id === 'configure')).toMatchObject({ enteredCount: 1, completedCount: 1 });
        expect(flow.sessionsWithCompletion).toBe(1);
        expect(flow.terminalCount).toBe(0);
    });

    it('collapses consecutive repeats of the same completed step', async () => {
        // Arrange
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(0), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(1), config.area);

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        // Assert
        expect(flow.nodes).toEqual([{ id: 'configure', label: 'Konfig DE' }]);
        expect(flow.links).toEqual([]);
        expect(flow.steps.find((step) => step.id === 'configure')?.completedCount).toBe(1);
    });

    it('drops backward step edges so the sankey stays a DAG', async () => {
        // Arrange
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(0), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'checkout', 'step_completed', window.at(1), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(2), config.area);

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        // Assert
        expect(flow.links).toEqual([{ source: 'configure', target: 'checkout', value: 1 }]);
        expect(flow.links.some((link) => link.source === 'checkout' && link.target === 'configure')).toBe(false);
    });

    it('maps lifecycle events onto the terminal step', async () => {
        // Arrange
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(0), config.area);
        const paid = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'GIFT_CARD_PAYED',
            payload: { giftCardId: idCreate() },
        });
        await stamp(paid.sessionEventId, window.at(1));
        const ignored = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'COOK_CREATED',
            payload: {},
        });
        await stamp(ignored.sessionEventId, window.at(2));

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        // Assert
        expect(flow.steps.find((step) => step.id === 'paid')).toMatchObject({
            label: 'Paid DE',
            enteredCount: 0,
            completedCount: 1,
        });
        expect(flow.links).toEqual([{ source: 'configure', target: 'paid', value: 1 }]);
        expect(flow.terminalCount).toBe(1);
        expect(flow.sessionsWithCompletion).toBe(1);
    });

    it('ignores steps outside the config and events from another area', async () => {
        // Arrange
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;
        await recordStep(setup.serverRuntime, sessionId, 'auth', 'step_completed', window.at(0), config.area);
        const otherStep = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'CHEF_SIGN_UP',
                area: config.area,
                interaction: { type: 'step_completed', step: 'profile' },
            },
        });
        await stamp(otherStep.sessionEventId, window.at(1));
        const click = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'GIFT_CARD',
                area: config.area,
                interaction: { type: 'click', key: 'cta' },
            },
        });
        await stamp(click.sessionEventId, window.at(2));
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(3), 'some_other_area');

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        // Assert
        expect(flow.steps.find((step) => step.id === 'auth')?.completedCount).toBe(1);
        expect(flow.steps.find((step) => step.id === 'configure')?.completedCount).toBe(0);
        expect(flow.nodes).toEqual([{ id: 'auth', label: 'Auth DE' }]);
        expect(flow.links).toEqual([]);
    });

    it('excludes cook sessions when excludeCooks is set', async () => {
        // Arrange
        const human = await commandSetup();
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Excluded' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const config = funnelConfigCreate();
        const window = windowCreate();
        await recordStep(human.serverRuntime, human.requestingSession.sessionId, 'configure', 'step_completed', window.at(0), config.area);
        await recordStep(cook.serverRuntime, cook.requestingSession.sessionId, 'auth', 'step_completed', window.at(1), config.area);

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, human.requestingSession, human.serverRuntime, {
            ...config,
            excludeCooks: true,
        });

        // Assert
        expect(flow.steps.find((step) => step.id === 'configure')?.completedCount).toBe(1);
        expect(flow.steps.find((step) => step.id === 'auth')?.completedCount).toBe(0);
        expect(flow.sessionsWithCompletion).toBe(1);
    });

    it('includes cook sessions when excludeCooks is false', async () => {
        // Arrange
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Included' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const config = funnelConfigCreate();
        const window = windowCreate();
        await recordStep(cook.serverRuntime, cook.requestingSession.sessionId, 'configure', 'step_completed', window.at(0), config.area);

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, cook.requestingSession, cook.serverRuntime, config);

        // Assert
        expect(flow.steps.find((step) => step.id === 'configure')?.completedCount).toBe(1);
        expect(flow.sessionsWithCompletion).toBe(1);
    });

    it('excludes bot, admin, and impersonation sessions', async () => {
        // Arrange
        const human = await commandSetup();
        const bot = await commandSetup();
        await testDb.update(sessions).set({ isBot: true }).where(eq(sessions.sessionId, bot.requestingSession.sessionId));
        const admin = await commandSetup.withUser({ firstName: 'Funnel', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const impersonated = await commandSetup.withUser({ firstName: 'Funnel', lastName: 'Impersonated' });
        await testDb
            .update(sessions)
            .set({ impersonationReturnSessionId: admin.requestingSession.sessionId })
            .where(eq(sessions.sessionId, impersonated.requestingSession.sessionId));
        const config = funnelConfigCreate();
        const window = windowCreate();
        await recordStep(human.serverRuntime, human.requestingSession.sessionId, 'auth', 'step_completed', window.at(0), config.area);
        await recordStep(bot.serverRuntime, bot.requestingSession.sessionId, 'configure', 'step_completed', window.at(1), config.area);
        await recordStep(admin.serverRuntime, admin.requestingSession.sessionId, 'configure', 'step_completed', window.at(2), config.area);
        await recordStep(
            impersonated.serverRuntime,
            impersonated.requestingSession.sessionId,
            'configure',
            'step_completed',
            window.at(3),
            config.area,
        );

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, human.requestingSession, human.serverRuntime, config);

        // Assert
        expect(flow.steps.find((step) => step.id === 'auth')?.completedCount).toBe(1);
        expect(flow.steps.find((step) => step.id === 'configure')?.completedCount).toBe(0);
        expect(flow.sessionsWithCompletion).toBe(1);
    });

    it('returns zero counts for an empty window', async () => {
        // Arrange
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();

        // Act
        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        // Assert
        expect(flow.nodes).toEqual([]);
        expect(flow.links).toEqual([]);
        expect(flow.sessionsWithCompletion).toBe(0);
        expect(flow.terminalCount).toBe(0);
        expect(flow.steps.every((step) => step.enteredCount === 0 && step.completedCount === 0)).toBe(true);
    });

    it('counts a completed step as reached when there is no step_entered', async () => {
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        await recordStep(setup.serverRuntime, setup.requestingSession.sessionId, 'auth', 'step_completed', window.at(0), config.area);

        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        expect(flow.steps.find((step) => step.id === 'auth')).toMatchObject({ enteredCount: 1, completedCount: 1 });
        expect(flow.steps.find((step) => step.id === 'paid')?.enteredCount).toBe(0);
    });

    it('orders sankey edges by catalog even when paid arrives before checkout completed', async () => {
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;
        const paid = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'GIFT_CARD_PAYED',
            payload: { giftCardId: idCreate() },
        });
        await stamp(paid.sessionEventId, window.at(0));
        await recordStep(setup.serverRuntime, sessionId, 'checkout', 'step_completed', window.at(1), config.area);

        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        expect(flow.links).toEqual([{ source: 'checkout', target: 'paid', value: 1 }]);
        expect(flow.terminalCount).toBe(1);
    });

    it('counts each session once on a catalog edge even after A→B→A→B edits', async () => {
        const setup = await commandSetup();
        const config = funnelConfigCreate();
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(0), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'auth', 'step_completed', window.at(1), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(2), config.area);
        await recordStep(setup.serverRuntime, sessionId, 'auth', 'step_completed', window.at(3), config.area);

        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        expect(flow.links).toEqual([{ source: 'configure', target: 'auth', value: 1 }]);
    });

    it('counts terminalCount only on the last lifecycle step', async () => {
        const setup = await commandSetup();
        const config: AdminAnalyticsSessionFunnelConfig = {
            ...funnelConfigCreate(),
            steps: ['configure', 'created', 'checkout', 'paid'],
            labels: {
                configure: 'Konfig DE',
                created: 'Created DE',
                checkout: 'Checkout DE',
                paid: 'Paid DE',
            },
            lifecycleTypes: [
                { type: 'GIFT_CARD_CREATED', step: 'created' },
                { type: 'GIFT_CARD_PAYED', step: 'paid' },
            ],
        };
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;
        await recordStep(setup.serverRuntime, sessionId, 'configure', 'step_completed', window.at(0), config.area);
        const created = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'GIFT_CARD_CREATED',
            payload: { giftCardId: idCreate() },
        });
        await stamp(created.sessionEventId, window.at(1));

        const flow = await adminAnalyticsSessionFunnelFlow(window.range, setup.requestingSession, setup.serverRuntime, config);

        expect(flow.steps.find((step) => step.id === 'created')).toMatchObject({
            enteredCount: 0,
            completedCount: 1,
        });
        expect(flow.terminalCount).toBe(0);
        expect(flow.links).toEqual([{ source: 'configure', target: 'created', value: 1 }]);
    });
});
