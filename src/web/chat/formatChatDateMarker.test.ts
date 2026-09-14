import { describe, expect, it } from 'vitest';

import { formatChatDateMarker } from './formatChatDateMarker';

describe('formatChatDateMarker', () => {
    const now = new Date(2026, 9, 6, 15, 30, 0);

    it('returns Today / Heute for the current local calendar day', () => {
        expect(formatChatDateMarker('2026-10-06', 'en', now)).toBe('Today');
        expect(formatChatDateMarker('2026-10-06', 'de', now)).toBe('Heute');
    });

    it('returns Yesterday / Gestern for the previous local calendar day', () => {
        expect(formatChatDateMarker('2026-10-05', 'en', now)).toBe('Yesterday');
        expect(formatChatDateMarker('2026-10-05', 'de', now)).toBe('Gestern');
    });

    it('returns a long absolute date for older days', () => {
        expect(formatChatDateMarker('2026-10-02', 'en', now)).toBe('October 2, 2026');
        expect(formatChatDateMarker('2026-10-02', 'de', now)).toBe('2. Oktober 2026');
    });
});
