import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { cooks, featureToggles } from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { cookPresenceLinksReplace } from './cookPresenceLinksReplace';

describe('cookPresenceLinksReplace', () => {
    it('rejects when COOK_PRESENCE_LINKS is disabled', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Chef',
            lastName: 'Links',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'COOK_PRESENCE_LINKS', enabled: false })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: false },
            });

        await expect(
            cookPresenceLinksReplace(
                cookMutationParent(user.userId),
                { input: { websiteUrl: 'https://anna.example', otherProfiles: [] } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/COOK_PRESENCE_LINKS is disabled/);
    });

    it('saves normalized links and clears them when the input is blank', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Chef',
            lastName: 'Enabled',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'COOK_PRESENCE_LINKS', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });

        const saved = await cookPresenceLinksReplace(
            cookMutationParent(user.userId),
            {
                input: {
                    instagramUrl: 'https://instagram.com/anna.cooks',
                    otherProfiles: [{ platform: 'OTHER', label: 'supper club', url: 'https://supper.example' }],
                },
            },
            requestingSession,
            serverRuntime,
        );
        expect(saved).toEqual({ success: true, referenceId: user.userId });

        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row?.presenceLinks).toEqual({
            websiteUrl: null,
            instagramUrl: 'https://instagram.com/anna.cooks',
            googleProfileUrl: null,
            takeAChefUrl: null,
            otherProfiles: [{ platform: 'OTHER', label: 'Supper club', url: 'https://supper.example/' }],
        });

        await cookPresenceLinksReplace(
            cookMutationParent(user.userId),
            { input: { websiteUrl: '  ', otherProfiles: [] } },
            requestingSession,
            serverRuntime,
        );
        const [cleared] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(cleared?.presenceLinks).toBeNull();
    });

    it('rejects an Instagram URL that is not a profile', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Chef',
            lastName: 'Invalid',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'COOK_PRESENCE_LINKS', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });

        await expect(
            cookPresenceLinksReplace(
                cookMutationParent(user.userId),
                { input: { instagramUrl: 'https://example.com/anna', otherProfiles: [] } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/instagramHost/);
    });
});
