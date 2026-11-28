import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { admins, aiGenerations } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminCityCopyTranslate } from './adminCityCopyTranslate';

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

const germanInput = {
    nameDe: 'München',
    titleDe: 'Privatkoch in München buchen',
    descriptionDe: 'Professionelle Privatköche in München für Dinner zuhause.',
    headlineDe: 'Privatkoch in München',
    subHeadlineDe: 'Für jeden Anlass',
    firstSectionHeadlineDe: 'Koch für jeden Anlass',
    firstSectionBodyDe: 'Buche einen Privatkoch für Geburtstage und Dinner.',
};

describe('adminCityCopyTranslate', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    it('translates German city copy to Dutch and records an AiGeneration', async () => {
        const admin = await commandSetup.withUser({ firstName: 'city-nl-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    name: '  Munich  ',
                    title: 'Book a private chef in Munich',
                    description: 'Professional private chefs in Munich for dinner at home.',
                    headline: 'Private chef in Munich',
                    subHeadline: 'For every occasion',
                    firstSectionHeadline: 'A chef for any occasion',
                    firstSectionBody: 'Book a private chef for birthdays and dinners.',
                },
                'mock-city-translate',
            ),
        );

        const result = await adminCityCopyTranslate(
            adminMutationParent(admin.user.userId),
            { locale: 'nl', input: germanInput },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.name).toBe('Munich');
        expect(result.title).toBe('Book a private chef in Munich');
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string; instructions: string };
        expect(call.prompt).toContain('München');
        expect(call.instructions).toContain('Dutch');

        await admin.serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'CITY_COPY_TRANSLATE'), eq(aiGenerations.userId, admin.user.userId)));
        expect(generation?.sessionId).toBe(admin.requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-city-translate');
        expect(generation?.output).toContain('Book a private chef in Munich');
    });

    it('translates to English', async () => {
        const admin = await commandSetup.withUser({ firstName: 'city-en-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    name: 'Munich',
                    title: 'Book a private chef in Munich',
                    description: 'Professional private chefs in Munich.',
                    headline: 'Private chef in Munich',
                    subHeadline: 'For every occasion',
                    firstSectionHeadline: 'A chef for any occasion',
                    firstSectionBody: 'Book a private chef.',
                },
                'mock-city-en',
            ),
        );

        const result = await adminCityCopyTranslate(
            adminMutationParent(admin.user.userId),
            { locale: 'en', input: germanInput },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.headline).toBe('Private chef in Munich');
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { instructions: string };
        expect(call.instructions).toContain('English');
    });

    it('keeps empty first-section fields empty', async () => {
        const admin = await commandSetup.withUser({ firstName: 'city-empty-section', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    name: 'Munich',
                    title: 'Book a private chef in Munich',
                    description: 'Professional private chefs in Munich.',
                    headline: 'Private chef in Munich',
                    subHeadline: 'For every occasion',
                    firstSectionHeadline: 'Invented headline',
                    firstSectionBody: 'Invented body',
                },
                'mock-city-empty-section',
            ),
        );

        const result = await adminCityCopyTranslate(
            adminMutationParent(admin.user.userId),
            {
                locale: 'en',
                input: { ...germanInput, firstSectionHeadlineDe: '  ', firstSectionBodyDe: '' },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.firstSectionHeadline).toBe('');
        expect(result.firstSectionBody).toBe('');
    });

    it('rejects locales other than en and nl', async () => {
        const admin = await commandSetup.withUser({ firstName: 'city-fr-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminCityCopyTranslate(
                adminMutationParent(admin.user.userId),
                { locale: 'fr', input: germanInput },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/locale must be en or nl/);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('rejects empty German copy', async () => {
        const admin = await commandSetup.withUser({ firstName: 'city-empty-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminCityCopyTranslate(
                adminMutationParent(admin.user.userId),
                { locale: 'en', input: { ...germanInput, nameDe: '   ' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/required German fields must not be empty/);
        expect(generateText).not.toHaveBeenCalled();
    });
});
