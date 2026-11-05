import { describe, expect, it } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { adminDatabaseSlowStatementsFindMany } from './adminDatabaseSlowStatementsFindMany';

describe('adminDatabaseSlowStatementsFindMany', () => {
    it('returns mapped statements or an empty list when pg_stat_statements is unavailable', async () => {
        // Arrange
        const setup = await commandSetup();

        // Act
        const rows = await adminDatabaseSlowStatementsFindMany({ limit: 3 }, setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(rows.length).toBeLessThanOrEqual(3);
        for (const row of rows) {
            expect(typeof row.query).toBe('string');
            expect(row.query.length).toBeGreaterThan(0);
            expect(row.calls).toEqual(expect.any(Number));
            expect(row.totalExecTimeMs).toEqual(expect.any(Number));
            expect(row.meanExecTimeMs).toEqual(expect.any(Number));
            expect(row.rows).toEqual(expect.any(Number));
        }
    });
});
