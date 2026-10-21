import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { whatsAppConversations } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminWhatsAppConversationFindMany } from './adminWhatsAppConversationFindMany';

describe('adminWhatsAppConversationFindMany', () => {
    it('filters by searchText against linked user full name in either order', async () => {
        // Arrange
        const token = `WaNm${idCreate().slice(0, 8)}`;
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Zelda',
            lastName: token,
        });
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: `Ot${idCreate().slice(0, 8)}` });
        const matchId = idCreate();
        const otherId = idCreate();
        await testDb.insert(whatsAppConversations).values({
            whatsAppConversationId: matchId,
            phoneNumber: phoneNumberCreate(),
            userId: user.userId,
            lastMessageAt: new Date(),
            adminUnreadCount: 0,
        });
        await testDb.insert(whatsAppConversations).values({
            whatsAppConversationId: otherId,
            phoneNumber: phoneNumberCreate(),
            userId: other.user.userId,
            lastMessageAt: new Date(),
            adminUnreadCount: 0,
        });

        // Act
        const byFirstLast = await adminWhatsAppConversationFindMany(
            { criterion: { skip: 0, take: 100, searchText: `Zelda ${token}` } },
            requestingSession,
            serverRuntime,
        );
        const byLastFirst = await adminWhatsAppConversationFindMany(
            { criterion: { skip: 0, take: 100, searchText: `${token} Zelda` } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(byFirstLast.map((row) => row.whatsAppConversationId)).toEqual([matchId]);
        expect(byLastFirst.map((row) => row.whatsAppConversationId)).toEqual([matchId]);
        expect(byFirstLast.some((row) => row.whatsAppConversationId === otherId)).toBe(false);
    });
});
