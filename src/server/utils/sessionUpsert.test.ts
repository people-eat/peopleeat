import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessions } from '../db/schema';
import { testDb, testLogger } from '../test/commandTestUtils';
import { sessionUpsert } from './sessionUpsert';

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

describe('sessionUpsert', () => {
    it('creates a new session when no existing session ID is provided', async () => {
        const result = await sessionUpsert(testDb, testLogger, null, HUMAN_UA, null);

        expect(result.sessionId).toBeDefined();
        expect(typeof result.sessionId).toBe('string');

        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.sessionId));
        expect(row).toBeDefined();
        expect(row!.userAgent).toBe(HUMAN_UA);
        expect(row!.isBot).toBe(false);
    });

    it('creates a new session when session ID does not exist in DB', async () => {
        const unknownId = idCreate();

        const result = await sessionUpsert(testDb, testLogger, unknownId, HUMAN_UA, null);

        expect(result.sessionId).not.toBe(unknownId);

        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.sessionId));
        expect(row).toBeDefined();
        expect(row!.userAgent).toBe(HUMAN_UA);
    });

    it('creates a new session when the existing session was terminated', async () => {
        const [terminated] = await testDb
            .insert(sessions)
            .values({
                sessionId: idCreate(),
                userAgent: 'OldAgent',
                wasTerminatedAt: new Date(),
            })
            .returning();

        const result = await sessionUpsert(testDb, testLogger, terminated!.sessionId, HUMAN_UA, null);

        expect(result.sessionId).not.toBe(terminated!.sessionId);

        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.sessionId));
        expect(row).toBeDefined();
        expect(row!.userAgent).toBe(HUMAN_UA);
    });

    it('updates an existing non-terminated session', async () => {
        const past = new Date('2020-01-01');
        const [existing] = await testDb
            .insert(sessions)
            .values({
                sessionId: idCreate(),
                userAgent: 'OldAgent',
                lastInteractionAt: past,
            })
            .returning();

        const result = await sessionUpsert(testDb, testLogger, existing!.sessionId, HUMAN_UA, null);

        expect(result.sessionId).toBe(existing!.sessionId);

        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, existing!.sessionId));
        expect(row!.userAgent).toBe(HUMAN_UA);
        expect(row!.lastInteractionAt.getTime()).toBeGreaterThan(past.getTime());
    });

    it('handles null userAgent', async () => {
        const result = await sessionUpsert(testDb, testLogger, null, null, null);

        expect(result.sessionId).toBeDefined();

        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.sessionId));
        expect(row!.userAgent).toBeNull();
    });

    it('stamps referrer and landingPath on create and keeps them sticky on update', async () => {
        const result = await sessionUpsert(testDb, testLogger, null, HUMAN_UA, null, 'https://chatgpt.com/', '/en/projects');

        const [created] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.sessionId));
        expect(created!.referrer).toBe('https://chatgpt.com/');
        expect(created!.landingPath).toBe('/en/projects');
        expect(created!.isBot).toBe(false);

        await sessionUpsert(testDb, testLogger, result.sessionId, HUMAN_UA, null, 'https://www.google.com/', '/about');

        const [updated] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.sessionId));
        expect(updated!.referrer).toBe('https://chatgpt.com/');
        expect(updated!.landingPath).toBe('/en/projects');
    });

    it('marks known crawler user agents as bots', async () => {
        const result = await sessionUpsert(testDb, testLogger, null, BOT_UA, null);

        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.sessionId));
        expect(row!.isBot).toBe(true);
    });
});
