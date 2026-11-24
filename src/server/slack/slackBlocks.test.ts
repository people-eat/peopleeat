import { describe, expect, it } from 'vitest';

import { LARGE_GROUP_PARTICIPANT_THRESHOLD } from './bookingRequestSlack';
import { slackMessageBlocksBuild } from './slackBlocks';
import { slackChannelsCreate } from './slackChannels';
import { SLACK_CTA } from './slackCta';
import {
    slackFormatParticipants,
    slackFormatPriceClass,
    slackFormatTestimonialKind,
    slackPaymentFailedBody,
    slackTestimonialUpsertMessageBuild,
} from './slackFormat';

describe('slackMessageBlocksBuild', () => {
    it('builds header, fields, body, context, and admin button', () => {
        const { text, blocks } = slackMessageBlocksBuild({
            header: 'Neue Buchungsanfrage · Max Mustermann',
            fields: [
                { label: 'Datum', value: 'Fr., 15. März 2026, 19:00' },
                { label: 'Ort', value: 'München' },
            ],
            body: 'Bitte vegetarisch.',
            contextLines: ['12 Köche benachrichtigt'],
            adminHref: 'https://example.com/admin/booking-requests/abc',
            adminButtonTitle: SLACK_CTA.request,
        });

        expect(text).toBe('Neue Buchungsanfrage · Max Mustermann');
        expect(blocks[0]).toMatchObject({ type: 'header' });
        expect(blocks.some((block) => block.type === 'section' && 'fields' in block)).toBe(true);
        expect(blocks.some((block) => block.type === 'section' && 'text' in block)).toBe(true);
        expect(blocks.some((block) => block.type === 'context')).toBe(true);
        expect(blocks.some((block) => block.type === 'actions')).toBe(true);
        expect(JSON.stringify(blocks)).toContain(SLACK_CTA.request);
        expect(JSON.stringify(blocks)).not.toContain('In Admin öffnen');
    });

    it('requires adminButtonTitle when adminHref is set', () => {
        expect(() =>
            slackMessageBlocksBuild({
                header: 'Info',
                adminHref: 'https://example.com/admin',
            }),
        ).toThrow(/adminButtonTitle/);
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

    it('formats price class without em dash', () => {
        expect(slackFormatPriceClass('MEDIUM')).toBe('Signature Menü');
        expect(slackFormatPriceClass(null)).toBe('nicht gesetzt');
    });

    it('formats testimonial kinds in German', () => {
        expect(slackFormatTestimonialKind('REMINDER_MORNING')).toBe('Morgen-Erinnerung');
        expect(slackFormatTestimonialKind('MEMORY_NUDGE')).toBe('Memory-Nudge');
    });

    it('builds testimonial upsert Slack copy for create/update and audiences', () => {
        expect(
            slackTestimonialUpsertMessageBuild({
                audience: 'CUSTOMER',
                action: 'CREATED',
                viaAdmin: false,
                authorName: 'Ada Guest',
                rating: 5,
                body: 'Loved it',
                imageCount: 2,
            }),
        ).toEqual({
            header: 'Kundenbewertung erstellt · Ada Guest',
            fields: [
                { label: 'Bewertung', value: '5/5' },
                { label: 'Bilder', value: '2 angehängt' },
            ],
            body: 'Loved it',
        });

        expect(
            slackTestimonialUpsertMessageBuild({
                audience: 'COOK',
                action: 'UPDATED',
                viaAdmin: true,
                authorName: 'Chef Review',
                rating: 4,
                body: null,
                imageCount: 0,
            }),
        ).toEqual({
            header: 'Kochbewertung aktualisiert (Admin) · Chef Review',
            fields: [{ label: 'Bewertung', value: '4/5' }],
            body: undefined,
        });
    });

    it('maps payment failures without leaking Stripe event codes for unknown detail', () => {
        expect(slackPaymentFailedBody('payment_intent.payment_failed')).toContain('Kartenzahlung');
        expect(slackPaymentFailedBody('pi_raw_error')).not.toContain('pi_');
    });

    it('exposes large-group threshold of 12', () => {
        expect(LARGE_GROUP_PARTICIPANT_THRESHOLD).toBe(12);
    });
});
