import { describe, expect, it } from 'vitest';

import { testDb } from '../test/commandTestUtils';
import { databaseSlowStatementsFindMany, databaseSlowStatementsUnavailable } from './databaseSlowStatementsFindMany';

describe('databaseSlowStatementsFindMany', () => {
    it('maps pg_stat_statements rows or throws when the extension is missing', async () => {
        // Arrange
        const limit = 3;

        // Act
        let rows: Awaited<ReturnType<typeof databaseSlowStatementsFindMany>> | undefined;
        let thrown: unknown;
        try {
            rows = await databaseSlowStatementsFindMany(testDb, limit);
        } catch (error) {
            thrown = error;
        }

        // Assert
        if (thrown) {
            expect(databaseSlowStatementsUnavailable(thrown)).toBe(true);
            return;
        }
        expect(rows).toBeDefined();
        expect(rows!.length).toBeLessThanOrEqual(limit);
        for (const row of rows!) {
            expect(typeof row.query).toBe('string');
            expect(row.query.length).toBeGreaterThan(0);
            expect(row.calls).toEqual(expect.any(Number));
            expect(row.totalExecTimeMs).toEqual(expect.any(Number));
            expect(row.meanExecTimeMs).toEqual(expect.any(Number));
            expect(row.rows).toEqual(expect.any(Number));
        }
    });
});

describe('databaseSlowStatementsUnavailable', () => {
    it('recognizes a missing pg_stat_statements relation', () => {
        // Arrange
        const error = new Error('relation "pg_stat_statements" does not exist');

        // Act
        const unavailable = databaseSlowStatementsUnavailable(error);

        // Assert
        expect(unavailable).toBe(true);
    });

    it('does not treat an unrelated error as a missing extension', () => {
        // Arrange
        const error = new Error('connection reset');

        // Act
        const unavailable = databaseSlowStatementsUnavailable(error);

        // Assert
        expect(unavailable).toBe(false);
    });
});
