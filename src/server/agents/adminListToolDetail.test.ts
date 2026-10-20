import { describe, expect, it } from 'vitest';

import {
    adminListDetailFromToolPart,
    adminListToolOutputForModel,
    adminListToolOutputToModelResult,
    resolveAdminListDetail,
} from './adminListToolDetail';

describe('adminListToolDetail', () => {
    it('defaults detail to summary', () => {
        expect(resolveAdminListDetail(undefined)).toBe('summary');
        expect(resolveAdminListDetail('evidence')).toBe('evidence');
    });

    it('reads detail from tool input, then output', () => {
        expect(adminListDetailFromToolPart({ input: { detail: 'evidence' } })).toBe('evidence');
        expect(adminListDetailFromToolPart({ output: { detail: 'evidence' } })).toBe('evidence');
        expect(adminListDetailFromToolPart({ input: {}, output: { detail: 'summary' } })).toBe('summary');
        expect(adminListDetailFromToolPart({})).toBe('summary');
    });

    it('summary omits card arrays and keeps count, ids, and meta', () => {
        const full = {
            count: 2,
            detail: 'summary' as const,
            bookingRequestIds: ['br1', 'br2'],
            createdAtFrom: '2026-01-01T00:00:00.000Z',
            createdAtTo: null,
            requests: [{ bookingRequestId: 'br1' }, { bookingRequestId: 'br2' }],
        };
        expect(adminListToolOutputForModel(full, 'summary')).toEqual({
            count: 2,
            detail: 'summary',
            bookingRequestIds: ['br1', 'br2'],
            createdAtFrom: '2026-01-01T00:00:00.000Z',
            createdAtTo: null,
        });
        expect(adminListToolOutputForModel(full, undefined)).toEqual({
            count: 2,
            detail: 'summary',
            bookingRequestIds: ['br1', 'br2'],
            createdAtFrom: '2026-01-01T00:00:00.000Z',
            createdAtTo: null,
        });
    });

    it('evidence keeps the full payload', () => {
        const full = {
            count: 1,
            detail: 'evidence' as const,
            userIds: ['u1'],
            users: [{ userId: 'u1', firstName: 'Ada' }],
        };
        expect(adminListToolOutputForModel(full, 'evidence')).toEqual(full);
    });

    it('wraps lean output for toModelOutput', () => {
        expect(adminListToolOutputToModelResult({ count: 0, detail: 'summary', mealIds: [], meals: [] }, 'summary')).toEqual({
            type: 'json',
            value: { count: 0, detail: 'summary', mealIds: [] },
        });
    });
});
