import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations, cooks, meals } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookMenuSuggestionFromText } from './cookMenuSuggestionFromText';
import { fileUploadCreate } from './fileUploadCreate';

vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof AiModule>();
    return {
        ...actual,
        generateText: vi.fn(),
    };
});

vi.mock('../utils/featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => true),
}));

vi.mock('../utils/docxTextExtract', () => ({
    docxTextExtract: vi.fn(async () => 'Word-Menü: Tomatensuppe, dann Fisch.'),
}));

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

describe('cookMenuSuggestionFromText', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);
    });

    it('rejects when AI_MENU_CREATE is disabled', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Off' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);

        await expect(
            cookMenuSuggestionFromText(cookMutationParent(user.userId), { text: 'Ein Menü.' }, requestingSession, serverRuntime),
        ).rejects.toThrow(/AI_MENU_CREATE is disabled/);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('rejects when text and files are both empty', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Empty' });
        await testDb.insert(cooks).values({ cookId: user.userId });

        await expect(
            cookMenuSuggestionFromText(cookMutationParent(user.userId), { text: '   ' }, requestingSession, serverRuntime),
        ).rejects.toThrow(/text or files required/);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('returns a draft that reuses existing meals and proposes new ones without inserting', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Cleo', lastName: 'Draft' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const existingMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: existingMealId,
            cookId: user.userId,
            title: 'Tomatensuppe',
            description: 'Tomaten',
            publishedAt: new Date('2030-01-01T00:00:00.000Z'),
        });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    title: '  sommer menü  ',
                    description: '  leicht und frisch.  ',
                    courses: [
                        {
                            title: '  vorspeise  ',
                            mealOptions: [
                                { type: 'EXISTING_MEAL', mealId: existingMealId, title: null, description: null },
                                { type: 'NEW_MEAL', mealId: null, title: '  gegrillter fisch  ', description: '  mit zitrone.  ' },
                            ],
                        },
                    ],
                },
                'mock-from-text',
            ),
        );

        const result = await cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { text: 'Vorspeise Tomatensuppe, danach gegrillter Fisch.' },
            requestingSession,
            serverRuntime,
        );

        expect(result.title).toBe('Sommer menü');
        expect(result.description).toBe('Leicht und frisch.');
        expect(result.courses).toEqual([
            {
                title: 'Vorspeise',
                mealOptions: [
                    { type: 'EXISTING_MEAL', mealId: existingMealId, title: null, description: null },
                    { type: 'NEW_MEAL', mealId: null, title: 'Gegrillter fisch', description: 'Mit zitrone.' },
                ],
            },
        ]);

        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(1);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        const call = vi.mocked(generateText).mock.calls[0]?.[0] as {
            messages: Array<{ content: Array<{ type: string; text?: string }> }>;
        };
        const textPart = call.messages[0]?.content.find((part) => part.type === 'text');
        expect(textPart?.text).toContain('Tomatensuppe');
        expect(textPart?.text).toContain('Vorspeise Tomatensuppe, danach gegrillter Fisch.');

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_SUGGESTION_FROM_TEXT'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.sessionId).toBe(requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-from-text');
        expect(generation?.output).toContain('sommer menü');
        expect(generation?.inputTokens).toBe(11);
        expect(generation?.cachedInputTokens).toBe(3);
    });

    it('skips unknown existing meals and incomplete new meals', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Dora', lastName: 'Skip' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    title: 'Lücken Menü',
                    description: '',
                    courses: [
                        {
                            title: 'zwischengang',
                            mealOptions: [
                                { type: 'EXISTING_MEAL', mealId: idCreate(), title: null, description: null },
                                { type: 'NEW_MEAL', mealId: null, title: 'Nur Titel', description: null },
                                { type: 'NEW_MEAL', mealId: null, title: null, description: 'Nur Beschreibung' },
                            ],
                        },
                    ],
                },
                'mock-from-text-skip',
            ),
        );

        const result = await cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { text: 'Unvollständig.' },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({
            title: 'Lücken Menü',
            description: '',
            courses: [{ title: 'Zwischengang', mealOptions: [] }],
        });
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(0);
    });

    it('sends PDF bytes as a file part and records a placeholder in the prompt ledger', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Eva', lastName: 'Pdf' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const upload = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'menu.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF-fake'),
        });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    title: 'PDF Menü',
                    description: 'Aus der Karte.',
                    courses: [{ title: 'Vorspeise', mealOptions: [] }],
                },
                'mock-from-text-pdf',
            ),
        );

        const result = await cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { fileUploadIds: [upload.fileUploadId] },
            requestingSession,
            serverRuntime,
        );

        expect(result.title).toBe('PDF Menü');
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as {
            messages: Array<{ content: Array<{ type: string; mediaType?: string }> }>;
        };
        expect(call.messages[0]?.content.some((part) => part.type === 'file' && part.mediaType === 'application/pdf')).toBe(true);

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_SUGGESTION_FROM_TEXT'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.prompt).toContain('[file mediaType=application/pdf');
        expect(generation?.prompt).toContain('menu.pdf');
    });

    it('sends image bytes as a file part', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Eve', lastName: 'Jpeg' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const upload = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'karte.jpg',
            mediaType: 'image/jpeg',
            bytes: Buffer.from('fake-jpeg'),
        });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    title: 'Foto Menü',
                    description: 'Aus dem Foto.',
                    courses: [{ title: 'Vorspeise', mealOptions: [] }],
                },
                'mock-from-text-jpeg',
            ),
        );

        await cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { fileUploadIds: [upload.fileUploadId] },
            requestingSession,
            serverRuntime,
        );

        const call = vi.mocked(generateText).mock.calls[0]?.[0] as {
            messages: Array<{ content: Array<{ type: string; mediaType?: string }> }>;
        };
        expect(call.messages[0]?.content.some((part) => part.type === 'file' && part.mediaType === 'image/jpeg')).toBe(true);
    });

    it('extracts plain text and Word files into the prompt instead of file parts', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Finn', lastName: 'Docs' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const txt = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'notes.txt',
            mediaType: 'text/plain',
            bytes: Buffer.from('Handgeschriebene Karte: Risotto'),
        });
        const docx = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'menu.docx',
            mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            bytes: Buffer.from('fake-docx'),
        });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                { title: 'Risotto Abend', description: '', courses: [{ title: 'Hauptgang', mealOptions: [] }] },
                'mock-from-text-docs',
            ),
        );

        await cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { fileUploadIds: [txt.fileUploadId, docx.fileUploadId] },
            requestingSession,
            serverRuntime,
        );

        const call = vi.mocked(generateText).mock.calls[0]?.[0] as {
            messages: Array<{ content: Array<{ type: string; text?: string }> }>;
        };
        const textPart = call.messages[0]?.content.find((part) => part.type === 'text');
        expect(textPart?.text).toContain('Handgeschriebene Karte: Risotto');
        expect(textPart?.text).toContain('Word-Menü: Tomatensuppe, dann Fisch.');
        expect(call.messages[0]?.content.some((part) => part.type === 'file')).toBe(false);
    });

    it('logs and rethrows when the model throws', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Gia', lastName: 'Throw' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(generateText).mockRejectedValue(new Error('model down'));

        await expect(
            cookMenuSuggestionFromText(cookMutationParent(user.userId), { text: 'Ein Menü.' }, requestingSession, serverRuntime),
        ).rejects.toThrow(/model down/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        await serverRuntime.aiGenerations.drain();
        const generations = await testDb.select().from(aiGenerations).where(eq(aiGenerations.userId, user.userId));
        expect(generations).toHaveLength(0);
        const logs = await findLogsForSession(requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('model down'))).toBe(true);
    });
});
