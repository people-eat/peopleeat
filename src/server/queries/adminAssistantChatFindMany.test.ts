import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { chats } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminAssistantChatCreationsFindMany } from './adminAssistantChatCreationsFindMany';
import { adminAssistantChatFindMany } from './adminAssistantChatFindMany';
import { adminAssistantChatsCounts } from './adminAssistantChatsCounts';

describe('adminAssistantChatsCounts', () => {
    it('returns one count per criterion in order', async () => {
        const admin = await commandSetup.withUser({ firstName: 'assistant-counts-admin', lastName: 'User' });

        const [total, adminSurface, customer, cook] = await adminAssistantChatsCounts(
            {
                criteria: [{}, { surface: 'admin' }, { surface: 'customer' }, { surface: 'cook' }],
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(total).toBeGreaterThanOrEqual(0);
        expect(adminSurface).toBeGreaterThanOrEqual(0);
        expect(customer).toBeGreaterThanOrEqual(0);
        expect(cook).toBeGreaterThanOrEqual(0);
    });

    it('counts rows matching searchText and userIds', async () => {
        const token = `chat-${idCreate().slice(0, 8)}`;
        const setup = await commandSetup.withUser({ firstName: 'assistant-count-owner', lastName: 'User' });
        const other = await commandSetup.withUser({ firstName: 'assistant-count-other', lastName: 'User' });

        await testDb.insert(chats).values({
            chatId: idCreate(),
            userId: setup.user.userId,
            surface: 'customer',
            title: `${token}-one`,
        });
        await testDb.insert(chats).values({
            chatId: idCreate(),
            userId: setup.user.userId,
            surface: 'admin',
            title: `${token}-two`,
        });
        await testDb.insert(chats).values({
            chatId: idCreate(),
            userId: other.user.userId,
            surface: 'customer',
            title: `${token}-other`,
        });

        const [byTitle] = await adminAssistantChatsCounts(
            { criteria: [{ searchText: token }] },
            setup.requestingSession,
            setup.serverRuntime,
        );
        expect(byTitle).toBe(3);

        const [byUser] = await adminAssistantChatsCounts(
            { criteria: [{ searchText: token, userIds: [setup.user.userId] }] },
            setup.requestingSession,
            setup.serverRuntime,
        );
        expect(byUser).toBe(2);

        const [bySurface] = await adminAssistantChatsCounts(
            { criteria: [{ searchText: token, surface: 'admin' }] },
            setup.requestingSession,
            setup.serverRuntime,
        );
        expect(bySurface).toBe(1);
    });
});

describe('adminAssistantChatFindMany', () => {
    it('scopes to userIds and orders by lastModifiedAt desc', async () => {
        const setup = await commandSetup.withUser({ firstName: 'assistant-list-owner', lastName: 'User' });
        const olderId = idCreate();
        const newerId = idCreate();
        const olderAt = new Date('2026-01-01T00:00:00.000Z');
        const newerAt = new Date('2026-06-01T00:00:00.000Z');

        await testDb.insert(chats).values({
            chatId: olderId,
            userId: setup.user.userId,
            surface: 'cook',
            title: 'older',
            lastModifiedAt: olderAt,
        });
        await testDb.insert(chats).values({
            chatId: newerId,
            userId: setup.user.userId,
            surface: 'cook',
            title: 'newer',
            lastModifiedAt: newerAt,
        });

        const rows = await adminAssistantChatFindMany(
            { criterion: { userIds: [setup.user.userId], surface: 'cook', take: 10 } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        const scoped = rows.filter((row) => row.chatId === olderId || row.chatId === newerId);
        expect(scoped.map((row) => row.chatId)).toEqual([newerId, olderId]);
    });
});

describe('adminAssistantChatCreationsFindMany', () => {
    it('returns a zero-filled day series for the requested range', async () => {
        const admin = await commandSetup.withUser({ firstName: 'assistant-creations-admin', lastName: 'User' });
        const startDateTime = new Date(Date.UTC(2026, 7, 1));
        const endDateTime = new Date(Date.UTC(2026, 7, 7));

        const series = await adminAssistantChatCreationsFindMany(
            { range: { startDateTime, endDateTime }, granularity: 'day' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(series).toHaveLength(7);
        expect(series.every((bucket) => typeof bucket.count === 'number' && bucket.count >= 0)).toBe(true);
    });
});
