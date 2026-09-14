import { describe, expect, it } from 'vitest';

import { LARGE_GROUP_PARTICIPANT_THRESHOLD } from './bookingRequestSlack';
import { slackMessageBlocksBuild } from './slackBlocks';
import { slackChannelsCreate } from './slackChannels';
import { slackFormatParticipants, slackFormatPriceClass, slackShortId } from './slackFormat';

describe('slackMessageBlocksBuild', () => {
    it('builds header, fields, body, context, and admin button', () => {
        const { text, blocks } = slackMessageBlocksBuild({
            header: 'Neue Buchungsanfrage · Max Mustermann',
            fields: [
                { label: 'Datum', value: 'Fr., 15. März 2026, 19:00' },
                { label: 'Ort', value: 'München' },
            ],
            body: 'Bitte vegetarisch.',
            contextLines: ['Anfrage abcdef12 · Max Mustermann'],
            adminHref: 'https://example.com/admin/booking-requests/abc',
        });

        expect(text).toBe('Neue Buchungsanfrage · Max Mustermann');
        expect(blocks[0]).toMatchObject({ type: 'header' });
        expect(blocks.some((block) => block.type === 'section' && 'fields' in block)).toBe(true);
        expect(blocks.some((block) => block.type === 'section' && 'text' in block)).toBe(true);
        expect(blocks.some((block) => block.type === 'context')).toBe(true);
        expect(blocks.some((block) => block.type === 'actions')).toBe(true);
    });

    it('omits actions when no admin href', () => {
        const { blocks } = slackMessageBlocksBuild({
            header: 'Info',
            fields: [{ label: 'A', value: 'B' }],
        });
        expect(blocks.some((block) => block.type === 'actions')).toBe(false);
    });

    it('truncates long headers', () => {
        const long = 'x'.repeat(200);
        const { text } = slackMessageBlocksBuild({ header: long });
        expect(text.length).toBeLessThanOrEqual(150);
    });
});

describe('slackChannelsCreate', () => {
    it('trims empty channel ids to undefined', () => {
        const channels = slackChannelsCreate({
            bookingRequests: ' C1 ',
            cashCows: '',
            signUps: undefined,
            supportRequests: '  ',
            giftCardPurchases: 'C2',
            bookingRequestReports: undefined,
            opsAlerts: undefined,
            whatsAppMessages: undefined,
        });
        expect(channels.bookingRequests).toBe('C1');
        expect(channels.cashCows).toBeUndefined();
        expect(channels.supportRequests).toBeUndefined();
        expect(channels.giftCardPurchases).toBe('C2');
    });
});

describe('slackFormat helpers', () => {
    it('formats participants', () => {
        expect(slackFormatParticipants(4, 0)).toBe('4 Erwachsene');
        expect(slackFormatParticipants(4, 2)).toBe('4 Erwachsene, 2 Kinder');
        expect(slackFormatParticipants(1, 1)).toBe('1 Erwachsener, 1 Kind');
    });

    it('formats price class', () => {
        expect(slackFormatPriceClass('MEDIUM')).toBe('Signature Menü');
        expect(slackFormatPriceClass(null)).toBe('—');
    });

    it('shortens ids', () => {
        expect(slackShortId('abcdefgh-1234')).toBe('abcdefgh');
    });

    it('exposes large-group threshold of 12', () => {
        expect(LARGE_GROUP_PARTICIPANT_THRESHOLD).toBe(12);
    });
});
