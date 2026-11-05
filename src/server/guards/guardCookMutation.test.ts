import { describe, expect, it } from 'vitest';

import { cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { guardCookMutation } from './guardCookMutation';

describe('guardCookMutation', () => {
    it('rejects a banned cook', async () => {
        const { serverRuntime, requestingSession } = await commandSetup.withUser({ status: 'BANNED' });
        await testDb.insert(cooks).values({ cookId: requestingSession.userId! });

        await expect(guardCookMutation(requestingSession, serverRuntime)).rejects.toThrow(/guardCookMutation: user is not active/);
    });
});
