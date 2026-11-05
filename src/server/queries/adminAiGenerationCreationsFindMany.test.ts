import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminAiGenerationCreationsFindMany } from './adminAiGenerationCreationsFindMany';

function isolatedDays() {
    const year = 5000 + Math.floor(Math.random() * 4000);
    const day = 5 + Math.floor(Math.random() * 15);
    return {
        startDateTime: new Date(Date.UTC(year, 6, day)),
        endDateTime: new Date(Date.UTC(year, 6, day + 2)),
        createdAt: new Date(Date.UTC(year, 6, day + 1, 12)),
    };
}

describe('adminAiGenerationCreationsFindMany', () => {
    it('returns an ascending zero-filled day series with the seeded day counted', async () => {
        // Arrange
        const setup = await commandSetup();
        const window = isolatedDays();
        await testDb.insert(aiGenerations).values({
            aiGenerationId: idCreate(),
            kind: 'CHAT_TITLE',
            system: 'system',
            prompt: 'prompt',
            output: 'output',
            createdAt: window.createdAt,
        });

        // Act
        const series = await adminAiGenerationCreationsFindMany(
            { range: { startDateTime: window.startDateTime, endDateTime: window.endDateTime }, granularity: 'day' },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(series).toHaveLength(3);
        for (let index = 1; index < series.length; index += 1) {
            expect(series[index]!.bucketStart.getTime()).toBeGreaterThan(series[index - 1]!.bucketStart.getTime());
        }
        const hits = series.filter((bucket) => {
            const start = bucket.bucketStart.getTime();
            return window.createdAt.getTime() >= start && window.createdAt.getTime() < start + 86_400_000;
        });
        expect(hits).toHaveLength(1);
        expect(hits[0]!.count).toBe(1);
        expect(series.filter((bucket) => bucket !== hits[0]).every((bucket) => bucket.count === 0)).toBe(true);
    });
});
