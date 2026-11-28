import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { admins, aiGenerations } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminWebPageSeoTranslate } from './adminWebPageSeoTranslate';

vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof AiModule>();
    return {
        ...actual,
        generateText: vi.fn(),
    };
});

function modelObject(output: unknown, modelId: string) {
    return {
        output,
        usage: {
            inputTokens: 11,
            outputTokens: 7,
            totalTokens: 18,
            inputTokenDetails: { cacheReadTokens: 3 },
            outputTokenDetails: { reasoningTokens: 2 },
        },
        finalStep: { response: { modelId } },
    } as never;
}

describe('adminWebPageSeoTranslate', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    it('translates German SEO copy to Dutch and records an AiGeneration', async () => {
        const admin = await commandSetup.withUser({ firstName: 'seo-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                { title: '  Private chef for home  ', description: 'Book a professional private chef across Germany.' },
                'mock-seo-translate',
            ),
        );

        const result = await adminWebPageSeoTranslate(
            adminMutationParent(admin.user.userId),
            {
                webPageKey: 'LANDING',
                locale: 'nl',
                titleDe: 'Privatkoch für zuhause buchen',
                descriptionDe: 'Professionelle Privatköche deutschlandweit.',
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({
            title: 'Private chef for home',
            description: 'Book a professional private chef across Germany.',
        });
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string; instructions: string };
        expect(call.prompt).toContain('LANDING');
        expect(call.prompt).toContain('Privatkoch für zuhause buchen');
        expect(call.instructions).toContain('Dutch');

        await admin.serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'WEB_PAGE_SEO_TRANSLATE'), eq(aiGenerations.userId, admin.user.userId)));
        expect(generation?.sessionId).toBe(admin.requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-seo-translate');
        expect(generation?.output).toContain('Private chef for home');
    });

    it('translates to English', async () => {
        const admin = await commandSetup.withUser({ firstName: 'seo-en-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject({ title: 'Book a private chef', description: 'Professional private chefs across Germany.' }, 'mock-seo-en'),
        );

        const result = await adminWebPageSeoTranslate(
            adminMutationParent(admin.user.userId),
            {
                webPageKey: 'ABOUT_US',
                locale: 'en',
                titleDe: 'Über uns',
                descriptionDe: 'Erfahre mehr über peopleeat.',
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.title).toBe('Book a private chef');
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { instructions: string };
        expect(call.instructions).toContain('English');
    });

    it('rejects locales other than en and nl', async () => {
        const admin = await commandSetup.withUser({ firstName: 'seo-fr-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminWebPageSeoTranslate(
                adminMutationParent(admin.user.userId),
                {
                    webPageKey: 'LANDING',
                    locale: 'fr',
                    titleDe: 'Titel',
                    descriptionDe: 'Beschreibung',
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/locale must be en or nl/);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('rejects empty German copy', async () => {
        const admin = await commandSetup.withUser({ firstName: 'seo-empty-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminWebPageSeoTranslate(
                adminMutationParent(admin.user.userId),
                {
                    webPageKey: 'LANDING',
                    locale: 'en',
                    titleDe: '   ',
                    descriptionDe: 'Beschreibung',
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/titleDe and descriptionDe must not be empty/);
        expect(generateText).not.toHaveBeenCalled();
    });
});
