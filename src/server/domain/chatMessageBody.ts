/** Role of a turn-bound assistant-chat message (user or assistant). */
export type ChatMessageRole = 'user' | 'assistant';

export type ChatTurnStatus = 'queued' | 'running' | 'awaitingInput' | 'complete' | 'failed' | 'cancelled';

export type ChatMessageStatus = 'pending' | 'streaming' | 'complete' | 'failed' | 'cancelled';

export interface ChatTurnUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
}

type ChatMessagePartState = 'streaming' | 'done';

/**
 * Lifecycle of a single tool part inside an assistant message body.
 * Mirrors AI SDK tool UI states; GraphQL maps these to SCREAMING_SNAKE.
 */
export type ChatToolState =
    'inputStreaming' | 'inputAvailable' | 'approvalRequested' | 'approvalResponded' | 'outputAvailable' | 'outputError' | 'outputDenied';

export interface ChatToolApproval {
    approvalId: string;
    status: 'requested' | 'approved' | 'denied';
    descriptor?: unknown;
    reason?: string;
}

interface ChatMessagePartMetadata {
    /** Opaque provider blob (e.g. Gemini thoughtSignature). Never inspected. */
    metadata?: unknown;
}

/**
 * Application-owned message parts persisted in `ChatMessages.body` jsonb.
 * Not raw AI SDK UIMessage — `chatMessageAiAdapter` is the only
 * SDK boundary. `stepStart` is stored for replay and stripped from GraphQL.
 */
export type ChatMessagePart = ChatMessagePartMetadata &
    (
        | { type: 'text'; partId?: string; text: string; state: ChatMessagePartState }
        | { type: 'reasoning'; partId?: string; text: string; state: ChatMessagePartState }
        | { type: 'stepStart' }
        | {
              type: 'tool';
              toolCallId: string;
              toolName: string;
              title?: string;
              state: ChatToolState;
              providerExecuted?: boolean;
              preliminary?: boolean;
              approval?: ChatToolApproval;
              input?: unknown;
              output?: unknown;
              errorText?: string;
              /** Opaque provider options for this tool call (Gemini signatures, …). */
              providerOptions?: unknown;
          }
        | { type: 'sourceUrl'; sourceId: string; url: string; title?: string }
        | { type: 'sourceDocument'; sourceId: string; mediaType: string; title: string; filename?: string }
        | { type: 'file'; mediaType: string; filename?: string; url: string }
        | { type: 'data'; dataType: string; data: unknown }
    );

export interface ChatMessageBody {
    id: string;
    role: ChatMessageRole;
    parts: ChatMessagePart[];
    metadata?: unknown;
}

export function chatMessageBodyEmpty({ id, role }: { id: string; role: ChatMessageRole }): ChatMessageBody {
    return { id, role, parts: [] };
}

/** Flatten text parts for titles / copy / telemetry. */
export function chatMessageTextRead(message: ChatMessageBody): string {
    return message.parts
        .filter((part): part is Extract<ChatMessagePart, { type: 'text' }> => part.type === 'text')
        .map((part) => part.text)
        .join('');
}
