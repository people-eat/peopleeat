import { describe, expect, it } from 'vitest';

import { adminActionItemsSlackMessageBuild } from './adminActionItemsSlackMessage';
import type { AdminActionItemsSnapshot } from './adminActionItemsSnapshot';

function emptySnapshot(): AdminActionItemsSnapshot {
    return {
        pendingCooks: { count: 0, items: [] },
        blockedBookingRequests: { count: 0, items: [] },
        duePayoutOffers: { count: 0, items: [] },
        openSupportRequests: { count: 0, items: [] },
        pendingOfferChatReviews: { count: 0, items: [] },
    };
}

describe('adminActionItemsSlackMessageBuild', () => {
    it('posts an all-clear body when every queue is empty', () => {
        const { text, blocks } = adminActionItemsSlackMessageBuild(emptySnapshot());
        expect(text).toBe('Admin Aktionsübersicht');
        const body = JSON.stringify(blocks);
        expect(body).toContain('Alles erledigt');
    });

    it('includes queue sections when items exist', () => {
        const snapshot: AdminActionItemsSnapshot = {
            ...emptySnapshot(),
            pendingCooks: {
                count: 1,
                items: [
                    {
                        userId: '11111111111111111111',
                        displayName: 'Ada Cook',
                        emailAddress: 'ada@example.com',
                        createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    },
                ],
            },
        };
        const { blocks } = adminActionItemsSlackMessageBuild(snapshot);
        const body = JSON.stringify(blocks);
        expect(body).toContain('Freischaltungen ausstehend');
        expect(body).toContain('Ada Cook');
    });
});
