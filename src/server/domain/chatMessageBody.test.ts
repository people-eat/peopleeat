import { describe, expect, it } from 'vitest';

import { chatMessageBodyEmpty, chatMessageTextRead } from './chatMessageBody';

describe('chatMessageBody', () => {
    it('chatMessageBodyEmpty starts with no parts', () => {
        const body = chatMessageBodyEmpty({ id: 'msg-1', role: 'assistant' });
        expect(body).toEqual({ id: 'msg-1', role: 'assistant', parts: [] });
        expect(chatMessageTextRead(body)).toBe('');
    });

    it('chatMessageTextRead concatenates text parts only', () => {
        const text = chatMessageTextRead({
            id: 'msg-2',
            role: 'assistant',
            parts: [
                { type: 'text', text: 'Hello', state: 'done' },
                { type: 'reasoning', text: 'think', state: 'done' },
                { type: 'text', text: ' world', state: 'done' },
                { type: 'tool', toolCallId: 't1', toolName: 'x', state: 'outputAvailable' },
            ],
        });
        expect(text).toBe('Hello world');
    });
});
