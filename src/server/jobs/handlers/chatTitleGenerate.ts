import { generateText, Output } from 'ai';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { chatMessages, chats, chatTurns } from '../../db/schema';
import { chatMessageTextRead } from '../../domain/chatMessageBody';
import { CHAT_TITLE_MAX_LENGTH } from '../../domain/chatTitle';
import type { ServerRuntime } from '../../domain/ServerRuntime';
import { aiTelemetry } from '../../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../../utils/aiGenerationUsage';
import type { QueuedJobDefinition } from '../types';

interface ChatTitleGenerateData {
    chatId: string;
}

const NO_TOPIC_SENTINEL = 'NONE';
const REJECT_LONGER_THAN = 200;

const TITLE_SCHEMA = z.object({
    title: z
        .string()
        .describe(
            [
                'A ≤ 6-word, ≤ 50-character noun-phrase title in the same language the conversation is being held in.',
                'No quotes, no trailing punctuation, no "Chat about …" framing.',
                'Return exactly the string NONE (no quotes) if the exchange is a pure greeting or has no discernible topic yet.',
            ].join(' '),
        ),
});

const SYSTEM_PROMPT = [
    'You title chat threads. You are given the first user message and the first assistant reply.',
    '',
    'Output exactly one short title that names the topic: a noun phrase, ≤ 6 words, ≤ 50 characters.',
    'Write it in the same language the conversation is being held in (German or English).',
    'No quotes. No trailing punctuation. No "Chat about …" framing. No emoji. Never use em dashes (—).',
    '',
    'If the exchange is a pure greeting, a one-liner with no discernible topic, or otherwise reveals nothing to title on,',
    `respond with the single word ${NO_TOPIC_SENTINEL} (uppercase, no quotes).`,
].join('\n');

export const chatTitleGenerate: QueuedJobDefinition<ChatTitleGenerateData> = {
    kind: 'queued',
    name: 'chat-title-generate',
    handler: async ({ data, serverRuntime }) => {
        try {
            await generateChatTitle(data.chatId, serverRuntime);
        } catch (error) {
            serverRuntime.log.error(error, null);
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 60,
    },
};

async function generateChatTitle(chatId: string, serverRuntime: ServerRuntime): Promise<void> {
    const [chat] = await serverRuntime.db
        .select({ title: chats.title, userId: chats.userId })
        .from(chats)
        .where(eq(chats.chatId, chatId))
        .limit(1);
    if (!chat) {
        serverRuntime.log.warn(`chatTitleGenerate: chat ${chatId} not found (deleted?)`);
        return;
    }
    if (chat.title.trim().length > 0) return;

    const [firstTurn] = await serverRuntime.db
        .select({ chatTurnId: chatTurns.chatTurnId })
        .from(chatTurns)
        .where(and(eq(chatTurns.chatId, chatId), eq(chatTurns.status, 'complete')))
        .orderBy(asc(chatTurns.sequence))
        .limit(1);
    if (!firstTurn) return;

    const messageRows = await serverRuntime.db.select().from(chatMessages).where(eq(chatMessages.chatTurnId, firstTurn.chatTurnId));
    const userBody = messageRows.find((row) => row.role === 'user')?.body;
    const assistantBody = messageRows.find((row) => row.role === 'assistant')?.body;
    if (!userBody || !assistantBody) return;

    const userText = chatMessageTextRead(userBody);
    const assistantText = chatMessageTextRead(assistantBody);
    if (!userText || !assistantText) return;

    const userPrompt = [
        'First user message:',
        userText,
        '',
        'First assistant reply:',
        assistantText,
        '',
        `Return the title, or ${NO_TOPIC_SENTINEL}.`,
    ].join('\n');

    const result = await generateText({
        model: serverRuntime.ai.chatTitlerModel(),
        output: Output.object({ schema: TITLE_SCHEMA }),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        telemetry: aiTelemetry('CHAT_TITLE'),
    });

    serverRuntime.aiGenerations.record({
        kind: 'CHAT_TITLE',
        userId: chat.userId,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        output: aiGenerationOutputSerialize(result.output),
        ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
    });

    const rawTitle = result.output.title.trim();
    if (!rawTitle || rawTitle === NO_TOPIC_SENTINEL || rawTitle.length > REJECT_LONGER_THAN) return;
    const title = rawTitle.slice(0, CHAT_TITLE_MAX_LENGTH);

    const updated = await serverRuntime.db
        .update(chats)
        .set({ title, lastModifiedAt: new Date() })
        .where(and(eq(chats.chatId, chatId), eq(chats.title, '')))
        .returning({ userId: chats.userId });

    const ownerId = updated[0]?.userId;
    if (ownerId) {
        await serverRuntime.publish.userUpdates({ userId: ownerId });
    }
}
