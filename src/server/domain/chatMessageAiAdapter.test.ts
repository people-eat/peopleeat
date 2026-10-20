import { describe, expect, it } from 'vitest';

import { assistantPresentationNormalize, chatAssistantTextLooksLikeStructuredOutput } from '../agents/assistantPresentationOutput';
import {
    CHAT_DATA_TYPE_ADMIN_BOOKING_REQUEST_LIST,
    CHAT_DATA_TYPE_ADMIN_GIFT_CARD_LIST,
    CHAT_DATA_TYPE_ADMIN_MEAL_LIST,
    CHAT_DATA_TYPE_ADMIN_MENU_LIST,
    CHAT_DATA_TYPE_ADMIN_SUPPORT_REQUEST_LIST,
    CHAT_DATA_TYPE_ADMIN_TESTIMONIAL_LIST,
    CHAT_DATA_TYPE_ADMIN_USER_LIST,
    CHAT_DATA_TYPE_CHEF_CARD_LIST,
    CHAT_TOOL_ADMIN_BOOKING_REQUESTS_FIND_MANY,
    CHAT_TOOL_ADMIN_COOK_MEALS_FIND_MANY,
    CHAT_TOOL_ADMIN_COOK_MENUS_FIND_MANY,
    CHAT_TOOL_ADMIN_GIFT_CARDS_FIND_MANY,
    CHAT_TOOL_ADMIN_SUPPORT_REQUESTS_FIND_MANY,
    CHAT_TOOL_ADMIN_TESTIMONIALS_FIND_MANY,
    CHAT_TOOL_ADMIN_USERS_FIND_MANY,
} from '../db/chatPayloadTypes';
import { expandAdminListToolParts } from './chatMessageAiAdapter';
import { chatMessageBodyEmpty } from './chatMessageBody';
import type { ChatMessagePart } from './chatMessageBody';

// Exercise presentation expansion through the public stream adapter path by
// simulating the same JSON text an Output.object agent emits.

describe('assistant presentation → chat parts', () => {
    it('detects structured Output.object text', () => {
        expect(chatAssistantTextLooksLikeStructuredOutput('{"blocks":[{"kind":"markdown","text":"Hi"}]}')).toBe(true);
        expect(chatAssistantTextLooksLikeStructuredOutput('Hello chef')).toBe(false);
    });

    it('normalizes markdown + cardList into chef.cardList-shaped data', () => {
        const normalized = assistantPresentationNormalize({
            blocks: [
                { kind: 'markdown', text: 'Here are options' },
                {
                    kind: 'cardList',
                    cards: [{ title: 'Menu A', description: 'Three courses' }],
                },
            ],
        });
        expect(normalized?.blocks).toHaveLength(2);
        expect(normalized?.blocks[1]).toMatchObject({ kind: 'cardList' });
        const cards = normalized?.blocks[1];
        expect(cards && cards.kind === 'cardList' ? cards.cards[0]?.title : null).toBe('Menu A');
        expect(CHAT_DATA_TYPE_CHEF_CARD_LIST).toBe('chef.cardList');
        expect(chatMessageBodyEmpty({ id: 'm1', role: 'assistant' }).parts).toEqual([]);
    });

    it('materializes admin.bookingRequestList data parts and leans summary tool output', () => {
        const toolPart: ChatMessagePart = {
            type: 'tool',
            toolCallId: 't1',
            toolName: CHAT_TOOL_ADMIN_BOOKING_REQUESTS_FIND_MANY,
            state: 'outputAvailable',
            input: {},
            output: {
                count: 1,
                detail: 'summary',
                bookingRequestIds: ['br1'],
                createdAtFrom: null,
                createdAtTo: null,
                requests: [{ bookingRequestId: 'br1', occasion: 'Dinner' }],
            },
        };
        const expanded = expandAdminListToolParts([toolPart]);
        expect(expanded).toHaveLength(2);
        expect(expanded[0]).toMatchObject({
            type: 'tool',
            toolCallId: 't1',
            output: {
                count: 1,
                detail: 'summary',
                bookingRequestIds: ['br1'],
                createdAtFrom: null,
                createdAtTo: null,
            },
        });
        expect((expanded[0] as { output?: { requests?: unknown } }).output).not.toHaveProperty('requests');
        expect(expanded[1]).toMatchObject({
            type: 'data',
            dataType: CHAT_DATA_TYPE_ADMIN_BOOKING_REQUEST_LIST,
            data: { requests: [{ bookingRequestId: 'br1', occasion: 'Dinner' }] },
        });
    });

    it('keeps full tool output when detail is evidence', () => {
        const toolPart: ChatMessagePart = {
            type: 'tool',
            toolCallId: 't1',
            toolName: CHAT_TOOL_ADMIN_BOOKING_REQUESTS_FIND_MANY,
            state: 'outputAvailable',
            input: { detail: 'evidence' },
            output: {
                count: 1,
                detail: 'evidence',
                bookingRequestIds: ['br1'],
                createdAtFrom: null,
                createdAtTo: null,
                requests: [{ bookingRequestId: 'br1', occasion: 'Dinner' }],
            },
        };
        const expanded = expandAdminListToolParts([toolPart]);
        expect(expanded[0]).toEqual(toolPart);
        expect(expanded[1]).toMatchObject({
            type: 'data',
            dataType: CHAT_DATA_TYPE_ADMIN_BOOKING_REQUEST_LIST,
        });
    });

    it('materializes admin user / meal / menu list data parts from tool output', () => {
        const parts: ChatMessagePart[] = [
            {
                type: 'tool',
                toolCallId: 'u1',
                toolName: CHAT_TOOL_ADMIN_USERS_FIND_MANY,
                state: 'outputAvailable',
                input: { detail: 'evidence' },
                output: { count: 1, detail: 'evidence', userIds: ['u1'], users: [{ userId: 'u1', firstName: 'Ada' }] },
            },
            {
                type: 'tool',
                toolCallId: 'm1',
                toolName: CHAT_TOOL_ADMIN_COOK_MEALS_FIND_MANY,
                state: 'outputAvailable',
                input: { detail: 'evidence' },
                output: { count: 1, detail: 'evidence', mealIds: ['meal1'], meals: [{ mealId: 'meal1', title: 'Soup' }] },
            },
            {
                type: 'tool',
                toolCallId: 'n1',
                toolName: CHAT_TOOL_ADMIN_COOK_MENUS_FIND_MANY,
                state: 'outputAvailable',
                input: { detail: 'evidence' },
                output: {
                    count: 1,
                    detail: 'evidence',
                    menuIds: ['menu1'],
                    menus: [{ menuId: 'menu1', title: 'Tasting' }],
                },
            },
        ];
        const expanded = expandAdminListToolParts(parts);
        expect(expanded).toEqual([
            parts[0],
            { type: 'data', dataType: CHAT_DATA_TYPE_ADMIN_USER_LIST, data: { users: [{ userId: 'u1', firstName: 'Ada' }] } },
            parts[1],
            { type: 'data', dataType: CHAT_DATA_TYPE_ADMIN_MEAL_LIST, data: { meals: [{ mealId: 'meal1', title: 'Soup' }] } },
            parts[2],
            { type: 'data', dataType: CHAT_DATA_TYPE_ADMIN_MENU_LIST, data: { menus: [{ menuId: 'menu1', title: 'Tasting' }] } },
        ]);
    });

    it('materializes support / gift-card / testimonial list data parts', () => {
        const parts: ChatMessagePart[] = [
            {
                type: 'tool',
                toolCallId: 's1',
                toolName: CHAT_TOOL_ADMIN_SUPPORT_REQUESTS_FIND_MANY,
                state: 'outputAvailable',
                input: { detail: 'evidence' },
                output: {
                    count: 1,
                    detail: 'evidence',
                    supportRequestIds: ['sr1'],
                    supportRequests: [{ supportRequestId: 'sr1', subject: 'Help', customerName: 'Ada' }],
                },
            },
            {
                type: 'tool',
                toolCallId: 'g1',
                toolName: CHAT_TOOL_ADMIN_GIFT_CARDS_FIND_MANY,
                state: 'outputAvailable',
                input: { detail: 'evidence' },
                output: {
                    count: 1,
                    detail: 'evidence',
                    giftCardIds: ['gc1'],
                    giftCards: [{ giftCardId: 'gc1', occasion: 'Birthday' }],
                },
            },
            {
                type: 'tool',
                toolCallId: 'tm1',
                toolName: CHAT_TOOL_ADMIN_TESTIMONIALS_FIND_MANY,
                state: 'outputAvailable',
                input: { detail: 'evidence' },
                output: {
                    count: 1,
                    detail: 'evidence',
                    customerTestimonialIds: ['ct1'],
                    cookTestimonialIds: [],
                    testimonials: [{ kind: 'customer', testimonialId: 'ct1', displayAuthorName: 'Ada' }],
                },
            },
        ];
        const expanded = expandAdminListToolParts(parts);
        expect(expanded).toEqual([
            parts[0],
            {
                type: 'data',
                dataType: CHAT_DATA_TYPE_ADMIN_SUPPORT_REQUEST_LIST,
                data: { supportRequests: [{ supportRequestId: 'sr1', subject: 'Help', customerName: 'Ada' }] },
            },
            parts[1],
            {
                type: 'data',
                dataType: CHAT_DATA_TYPE_ADMIN_GIFT_CARD_LIST,
                data: { giftCards: [{ giftCardId: 'gc1', occasion: 'Birthday' }] },
            },
            parts[2],
            {
                type: 'data',
                dataType: CHAT_DATA_TYPE_ADMIN_TESTIMONIAL_LIST,
                data: { testimonials: [{ kind: 'customer', testimonialId: 'ct1', displayAuthorName: 'Ada' }] },
            },
        ]);
    });
});
