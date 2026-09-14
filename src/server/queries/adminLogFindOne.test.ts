import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { logs } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminLogFindOne } from './adminLogFindOne';

describe('adminLogFindOne', () => {
    it('returns the mapped log row', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const logId = idCreate();
        const createdAt = new Date('2024-06-01T12:00:00.000Z');
        await testDb.insert(logs).values({
            logId,
            sessionId: requestingSession.sessionId,
            level: 'error',
            message: 'detail-log-message',
            context: { name: 'Error', stack: '…' },
            createdAt,
        });

        // Act
        const row = await adminLogFindOne({ logId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            logId,
            sessionId: requestingSession.sessionId,
            level: 'error',
            message: 'detail-log-message',
            context: { name: 'Error', stack: '…' },
            createdAt,
        });
    });

    it('returns null when the log id is unknown', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act
        const row = await adminLogFindOne({ logId: idCreate() }, requestingSession, serverRuntime);

        // Assert
        expect(row).toBeNull();
    });
});
