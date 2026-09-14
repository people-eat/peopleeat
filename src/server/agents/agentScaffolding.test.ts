import { describe, expect, it } from 'vitest';
import {
    attachDelegateEvidence,
    collectSubAgentEvidence,
    googleAgentProviderOptionsFor,
    parseSubAgentFinalText,
    parseWebSearchFinalText,
    subAgentClosingRules,
    summarizeDelegateError,
    tryParseSubAgentSentinel,
} from './agentScaffolding';

describe('googleAgentProviderOptionsFor', () => {
    it('uses high thinking with thought summaries on gemini-3.6-flash', () => {
        expect(googleAgentProviderOptionsFor('gemini-3.6-flash').google.thinkingConfig).toEqual({
            thinkingLevel: 'high',
            includeThoughts: true,
        });
    });

    it('disables thinking on other Flash models', () => {
        expect(googleAgentProviderOptionsFor('gemini-2.5-flash').google.thinkingConfig).toEqual({ thinkingBudget: 0 });
        expect(googleAgentProviderOptionsFor('gemini-3.5-flash-lite').google.thinkingConfig).toEqual({ thinkingBudget: 0 });
    });

    it('requests thought summaries on Pro models', () => {
        expect(googleAgentProviderOptionsFor('gemini-3.1-pro-preview').google.thinkingConfig).toEqual({ includeThoughts: true });
    });

    it('always enables structuredOutputs', () => {
        expect(googleAgentProviderOptionsFor('gemini-2.5-flash').google.structuredOutputs).toBe(true);
        expect(googleAgentProviderOptionsFor('gemini-3.6-flash').google.structuredOutputs).toBe(true);
        expect(googleAgentProviderOptionsFor('gemini-3.1-pro-preview').google.structuredOutputs).toBe(true);
    });
});

describe('subAgentClosingRules', () => {
    it('embeds domain label, sentinels, and presentable items contract', () => {
        const lines = subAgentClosingRules({ domainLabel: 'media', outOfDomainExample: 'add a task' });
        const joined = lines.join('\n');
        expect(joined).toContain('needsMoreInfo');
        expect(joined).toContain('noOp');
        expect(joined).toContain('media');
        expect(joined).toContain('add a task');
        expect(joined).toContain('"items"');
        expect(joined).toContain('imageUrl');
        expect(joined).toContain('the user');
    });
});

describe('tryParseSubAgentSentinel', () => {
    it('parses a bare needsMoreInfo object', () => {
        expect(tryParseSubAgentSentinel('{"status":"needsMoreInfo","missingFields":["title"],"summary":"Need a title"}')).toEqual({
            status: 'needsMoreInfo',
            missingFields: ['title'],
            summary: 'Need a title',
        });
    });

    it('parses a fenced noOp object', () => {
        expect(tryParseSubAgentSentinel('```json\n{"status":"noOp","missingFields":[],"summary":"Wrong domain"}\n```')).toEqual({
            status: 'noOp',
            missingFields: [],
            summary: 'Wrong domain',
        });
    });

    it('returns null for plain prose', () => {
        expect(tryParseSubAgentSentinel('Created the appointment.')).toBeNull();
    });
});

describe('parseSubAgentFinalText', () => {
    it('returns completed prose as summary-only', () => {
        expect(parseSubAgentFinalText('Created the appointment.')).toEqual({
            status: 'completed',
            summary: 'Created the appointment.',
        });
    });

    it('parses completed JSON with items', () => {
        expect(
            parseSubAgentFinalText(
                JSON.stringify({
                    status: 'completed',
                    summary: 'Three films.',
                    items: [{ title: 'Example film', imageUrl: 'https://example.com/poster.jpg' }],
                }),
            ),
        ).toEqual({
            status: 'completed',
            summary: 'Three films.',
            items: [{ title: 'Example film', imageUrl: 'https://example.com/poster.jpg' }],
        });
    });

    it('parses fenced completed JSON', () => {
        expect(parseSubAgentFinalText('```json\n{"status":"completed","summary":"Hi","items":[{"title":"A"}]}\n```')).toEqual({
            status: 'completed',
            summary: 'Hi',
            items: [{ title: 'A' }],
        });
    });

    it('extracts completed JSON when prose precedes it', () => {
        expect(
            parseSubAgentFinalText(
                'I found the details:\n\n{"status":"completed","summary":"Three items.","items":[{"title":"Example","imageUrl":"https://example.com/x.jpg"}]}',
            ),
        ).toEqual({
            status: 'completed',
            summary: 'Three items.',
            items: [{ title: 'Example', imageUrl: 'https://example.com/x.jpg' }],
        });
    });

    it('still prefers sentinels over completed', () => {
        expect(parseSubAgentFinalText('{"status":"noOp","missingFields":[],"summary":"Nope"}')).toEqual({
            status: 'noOp',
            missingFields: [],
            summary: 'Nope',
        });
    });
});

describe('parseWebSearchFinalText', () => {
    it('extracts items from completed JSON', () => {
        expect(
            parseWebSearchFinalText(
                '{"status":"completed","summary":"Three shops.","items":[{"title":"Example Shop","price":"€20","href":"https://a.test"}]}',
            ),
        ).toEqual({
            summary: 'Three shops.',
            items: [{ title: 'Example Shop', price: '€20', href: 'https://a.test' }],
        });
    });

    it('keeps plain prose as summary', () => {
        expect(parseWebSearchFinalText('Found nothing useful.')).toEqual({ summary: 'Found nothing useful.' });
    });
});

describe('summarizeDelegateError', () => {
    it('takes the first line of an Error message', () => {
        expect(summarizeDelegateError(new Error('boom\nstack'))).toBe('boom');
    });

    it('falls back for unknown shapes', () => {
        expect(summarizeDelegateError(null)).toBe('unknown error');
    });
});

describe('collectSubAgentEvidence', () => {
    const step = (calls: Array<{ toolCallId: string; toolName: string; output?: unknown; error?: unknown }>) => ({
        toolCalls: calls.map(({ toolCallId, toolName }) => ({ toolCallId, toolName })),
        toolResults: calls.filter((call) => call.output !== undefined).map(({ toolCallId, output }) => ({ toolCallId, output })),
        content: calls
            .filter((call) => call.error !== undefined)
            .map(({ toolCallId, error }) => ({ type: 'tool-error' as const, toolCallId, error })),
    });

    it('returns last-N items in chronological order', () => {
        const { evidence, truncated } = collectSubAgentEvidence(
            [
                step([
                    { toolCallId: '1', toolName: 'itemsList', output: { ids: ['a'] } },
                    { toolCallId: '2', toolName: 'itemGet', output: { id: 'a', activities: [1] } },
                ]),
                step([{ toolCallId: '3', toolName: 'itemGet', output: { id: 'b' } }]),
            ],
            { maxItems: 2 },
        );
        expect(truncated).toBe(true);
        expect(evidence).toEqual([
            { toolName: 'itemGet', output: { id: 'a', activities: [1] } },
            { toolName: 'itemGet', output: { id: 'b' } },
        ]);
    });

    it('includes tool-error outputs as failed summaries', () => {
        expect(collectSubAgentEvidence([step([{ toolCallId: '1', toolName: 'itemGet', error: new Error('nope') }])]).evidence).toEqual([
            { toolName: 'itemGet', output: { status: 'failed', summary: 'nope' } },
        ]);
    });

    it('drops oldest items until under the char budget', () => {
        const { evidence, truncated } = collectSubAgentEvidence(
            [
                step([
                    { toolCallId: '1', toolName: 'a', output: 'xxxxxxxxxxxxxxxxxxxx' },
                    { toolCallId: '2', toolName: 'b', output: 'tiny' },
                ]),
            ],
            { maxItems: 10, maxChars: 80 },
        );
        expect(truncated).toBe(true);
        expect(evidence).toEqual([{ toolName: 'b', output: 'tiny' }]);
    });

    it('preview-truncates a single oversized leftover', () => {
        const { evidence, truncated } = collectSubAgentEvidence(
            [step([{ toolCallId: '1', toolName: 'itemGet', output: 'x'.repeat(200) }])],
            { maxItems: 10, maxChars: 100 },
        );
        expect(truncated).toBe(true);
        expect(evidence).toHaveLength(1);
        expect(evidence[0]?.toolName).toBe('itemGet');
        expect(evidence[0]?.output).toEqual(expect.objectContaining({ truncated: true, preview: expect.any(String) }));
    });
});

describe('attachDelegateEvidence', () => {
    const generateResult = {
        steps: [
            {
                toolCalls: [{ toolCallId: '1', toolName: 'itemGet' }],
                toolResults: [{ toolCallId: '1', output: { activities: [{ id: 'act-1' }] } }],
            },
        ],
    };

    it('no-ops unless detail is evidence on a completed result', () => {
        const completed = { status: 'completed' as const, summary: 'Three activities.' };
        expect(attachDelegateEvidence(completed, generateResult, undefined)).toEqual(completed);
        expect(attachDelegateEvidence(completed, generateResult, 'summary')).toEqual(completed);
        expect(
            attachDelegateEvidence(
                { status: 'needsMoreInfo', missingFields: ['itemId'], summary: 'Which item?' },
                generateResult,
                'evidence',
            ),
        ).toEqual({ status: 'needsMoreInfo', missingFields: ['itemId'], summary: 'Which item?' });
    });

    it('attaches evidence on completed + detail evidence', () => {
        expect(attachDelegateEvidence({ status: 'completed', summary: 'Three activities.' }, generateResult, 'evidence')).toEqual({
            status: 'completed',
            summary: 'Three activities.',
            evidence: [{ toolName: 'itemGet', output: { activities: [{ id: 'act-1' }] } }],
        });
    });
});
