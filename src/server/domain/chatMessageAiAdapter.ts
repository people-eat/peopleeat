import type { ModelMessage, UIMessage, UIMessageChunk, UIMessagePart, UITools } from 'ai';
import { convertToModelMessages, getToolName, isDataUIPart, isToolUIPart, readUIMessageStream } from 'ai';

import { assistantPresentationNormalize, chatAssistantTextLooksLikeStructuredOutput } from '../agents/assistantPresentationOutput';
import {
    CHAT_DATA_TYPE_ADMIN_BOOKING_REQUEST_LIST,
    CHAT_DATA_TYPE_ADMIN_MEAL_LIST,
    CHAT_DATA_TYPE_ADMIN_MENU_LIST,
    CHAT_DATA_TYPE_ADMIN_USER_LIST,
    CHAT_DATA_TYPE_CHEF_CARD_LIST,
    CHAT_TOOL_ADMIN_BOOKING_REQUESTS_FIND_MANY,
    CHAT_TOOL_ADMIN_COOK_MEALS_FIND_MANY,
    CHAT_TOOL_ADMIN_COOK_MENUS_FIND_MANY,
    CHAT_TOOL_ADMIN_USERS_FIND_MANY,
} from '../db/chatPayloadTypes';
import type {
    ChatAdminBookingRequestListItem,
    ChatAdminMealListItem,
    ChatAdminMenuListItem,
    ChatAdminUserListItem,
} from '../db/chatPayloadTypes';
import type { ChatMessageBody, ChatMessagePart, ChatToolApproval, ChatToolState } from './chatMessageBody';

type AiMessagePart = UIMessagePart<Record<string, unknown>, UITools>;
type AiToolPart = Extract<AiMessagePart, { type: `tool-${string}` | 'dynamic-tool' }>;
type AiProviderMetadata = NonNullable<Extract<AiMessagePart, { providerMetadata?: unknown }>['providerMetadata']>;
type ChatToolPart = Extract<ChatMessagePart, { type: 'tool' }>;

const toolStateFromAi: Record<AiToolPart['state'], ChatToolState> = {
    'input-streaming': 'inputStreaming',
    'input-available': 'inputAvailable',
    'approval-requested': 'approvalRequested',
    'approval-responded': 'approvalResponded',
    'output-available': 'outputAvailable',
    'output-error': 'outputError',
    'output-denied': 'outputDenied',
};

function approvalFromAi(approval: AiToolPart['approval']): ChatToolApproval | undefined {
    if (!approval) return undefined;
    let status: ChatToolApproval['status'] = 'requested';
    if ('approved' in approval && approval.approved !== undefined) {
        status = approval.approved ? 'approved' : 'denied';
    }
    return {
        approvalId: approval.id,
        status,
        descriptor: approval.descriptor,
        reason: approval.reason,
    };
}

function recordCheck(value: unknown): value is Record<string, Record<string, unknown>> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.values(value).every((entry) => typeof entry === 'object' && entry !== null)
    );
}

function providerMetadataToAi(metadata: unknown): AiProviderMetadata | undefined {
    return recordCheck(metadata) ? (metadata as AiProviderMetadata) : undefined;
}

function toolPartFromAi(part: AiToolPart): ChatMessagePart {
    const state = toolStateFromAi[part.state];
    const input = part.input;
    const providerOptions = part.callProviderMetadata ?? ('resultProviderMetadata' in part ? part.resultProviderMetadata : undefined);

    return {
        type: 'tool',
        toolCallId: part.toolCallId,
        toolName: getToolName(part),
        title: part.title,
        state,
        providerExecuted: part.providerExecuted,
        preliminary: 'preliminary' in part ? part.preliminary : undefined,
        approval: approvalFromAi(part.approval),
        input,
        output: part.output,
        errorText: part.errorText,
        providerOptions,
    };
}

function partFromAi(part: AiMessagePart): ChatMessagePart | null {
    if (part.type === 'step-start') return { type: 'stepStart' };
    if (part.type === 'text' || part.type === 'reasoning') {
        return {
            type: part.type,
            partId: 'id' in part ? part.id : undefined,
            text: part.text,
            state: part.state === 'streaming' ? 'streaming' : 'done',
            metadata: part.providerMetadata,
        };
    }
    if (part.type === 'source-url') {
        return { type: 'sourceUrl', sourceId: part.sourceId, url: part.url, title: part.title, metadata: part.providerMetadata };
    }
    if (part.type === 'source-document') {
        return {
            type: 'sourceDocument',
            sourceId: part.sourceId,
            mediaType: part.mediaType,
            title: part.title,
            filename: part.filename,
            metadata: part.providerMetadata,
        };
    }
    if (part.type === 'file') {
        return {
            type: 'file',
            mediaType: part.mediaType,
            filename: part.filename,
            url: part.url,
            metadata: part.providerMetadata,
        };
    }
    if (isToolUIPart(part)) return toolPartFromAi(part);
    if (isDataUIPart(part)) return { type: 'data', dataType: part.type.slice('data-'.length), data: part.data };
    return null;
}

/**
 * Expand `Output.object` presentation JSON (markdown + cardList blocks) into
 * durable text / `chef.cardList` data parts. Incomplete JSON while streaming
 * is dropped so the UI does not flash raw `{ "blocks": … }`.
 */
function expandPresentationParts(parts: ChatMessagePart[]): ChatMessagePart[] {
    const expanded: ChatMessagePart[] = [];
    for (const part of parts) {
        if (part.type !== 'text' || !chatAssistantTextLooksLikeStructuredOutput(part.text)) {
            expanded.push(part);
            continue;
        }
        if (part.state === 'streaming') {
            // Wait for a complete object before materializing cards / prose.
            continue;
        }
        try {
            const parsed: unknown = JSON.parse(part.text);
            const normalized = assistantPresentationNormalize(parsed as Parameters<typeof assistantPresentationNormalize>[0]);
            if (!normalized) {
                expanded.push(part);
                continue;
            }
            for (const block of normalized.blocks) {
                if (block.kind === 'markdown') {
                    expanded.push({ type: 'text', text: block.text, state: 'done', partId: part.partId });
                } else {
                    expanded.push({
                        type: 'data',
                        dataType: CHAT_DATA_TYPE_CHEF_CARD_LIST,
                        data: { cards: block.cards },
                    });
                }
            }
        } catch {
            expanded.push(part);
        }
    }
    return expanded;
}

function listItemsFromToolOutput<T>(output: unknown, key: string, isItem: (item: unknown) => item is T): T[] | null {
    if (output == null || typeof output !== 'object' || Array.isArray(output)) return null;
    const list = (output as Record<string, unknown>)[key];
    if (!Array.isArray(list) || list.length === 0) return null;
    const items = list.filter(isItem);
    return items.length > 0 ? items : null;
}

function isAdminBookingRequestListItem(item: unknown): item is ChatAdminBookingRequestListItem {
    return (
        item != null &&
        typeof item === 'object' &&
        typeof (item as ChatAdminBookingRequestListItem).bookingRequestId === 'string' &&
        typeof (item as ChatAdminBookingRequestListItem).occasion === 'string'
    );
}

function isAdminUserListItem(item: unknown): item is ChatAdminUserListItem {
    return (
        item != null &&
        typeof item === 'object' &&
        typeof (item as ChatAdminUserListItem).userId === 'string' &&
        typeof (item as ChatAdminUserListItem).firstName === 'string'
    );
}

function isAdminMealListItem(item: unknown): item is ChatAdminMealListItem {
    return (
        item != null &&
        typeof item === 'object' &&
        typeof (item as ChatAdminMealListItem).mealId === 'string' &&
        typeof (item as ChatAdminMealListItem).title === 'string'
    );
}

function isAdminMenuListItem(item: unknown): item is ChatAdminMenuListItem {
    return (
        item != null &&
        typeof item === 'object' &&
        typeof (item as ChatAdminMenuListItem).menuId === 'string' &&
        typeof (item as ChatAdminMenuListItem).title === 'string'
    );
}

/**
 * Materialize admin list `data` parts from completed find-many tool outputs so
 * the UI can render cards without relying on tool debug payloads.
 */
export function expandAdminListToolParts(parts: ChatMessagePart[]): ChatMessagePart[] {
    const expanded: ChatMessagePart[] = [];
    for (const part of parts) {
        expanded.push(part);
        if (part.type !== 'tool' || part.state !== 'outputAvailable') continue;

        if (part.toolName === CHAT_TOOL_ADMIN_BOOKING_REQUESTS_FIND_MANY) {
            const requests = listItemsFromToolOutput(part.output, 'requests', isAdminBookingRequestListItem);
            if (requests) {
                expanded.push({ type: 'data', dataType: CHAT_DATA_TYPE_ADMIN_BOOKING_REQUEST_LIST, data: { requests } });
            }
            continue;
        }
        if (part.toolName === CHAT_TOOL_ADMIN_USERS_FIND_MANY) {
            const users = listItemsFromToolOutput(part.output, 'users', isAdminUserListItem);
            if (users) {
                expanded.push({ type: 'data', dataType: CHAT_DATA_TYPE_ADMIN_USER_LIST, data: { users } });
            }
            continue;
        }
        if (part.toolName === CHAT_TOOL_ADMIN_COOK_MEALS_FIND_MANY) {
            const meals = listItemsFromToolOutput(part.output, 'meals', isAdminMealListItem);
            if (meals) {
                expanded.push({ type: 'data', dataType: CHAT_DATA_TYPE_ADMIN_MEAL_LIST, data: { meals } });
            }
            continue;
        }
        if (part.toolName === CHAT_TOOL_ADMIN_COOK_MENUS_FIND_MANY) {
            const menus = listItemsFromToolOutput(part.output, 'menus', isAdminMenuListItem);
            if (menus) {
                expanded.push({ type: 'data', dataType: CHAT_DATA_TYPE_ADMIN_MENU_LIST, data: { menus } });
            }
        }
    }
    return expanded;
}

function chatMessageBodyFromAi(message: UIMessage): ChatMessageBody {
    if (message.role === 'system') {
        throw new Error('System messages are not chat messages');
    }
    const parts = message.parts.flatMap((part) => {
        const mapped = partFromAi(part);
        return mapped ? [mapped] : [];
    });
    return {
        id: message.id,
        role: message.role,
        metadata: (message as { metadata?: unknown }).metadata,
        parts: expandAdminListToolParts(expandPresentationParts(parts)),
    };
}

function toolBaseToAi(part: ChatToolPart) {
    return {
        type: 'dynamic-tool' as const,
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        title: part.title,
        providerExecuted: part.providerExecuted,
        callProviderMetadata: providerMetadataToAi(part.providerOptions ?? part.metadata),
    };
}

function toolInputStreamingToAi(part: ChatToolPart): AiMessagePart {
    return { ...toolBaseToAi(part), state: 'input-streaming', input: part.input };
}

function toolInputAvailableToAi(part: ChatToolPart): AiMessagePart {
    return { ...toolBaseToAi(part), state: 'input-available', input: part.input };
}

function toolApprovalRequestedToAi(part: ChatToolPart): AiMessagePart {
    return {
        ...toolBaseToAi(part),
        state: 'approval-requested',
        input: part.input,
        approval: { id: part.approval?.approvalId ?? part.toolCallId, descriptor: part.approval?.descriptor },
    };
}

function toolApprovalRespondedToAi(part: ChatToolPart): AiMessagePart {
    return {
        ...toolBaseToAi(part),
        state: 'approval-responded',
        input: part.input,
        approval: {
            id: part.approval?.approvalId ?? part.toolCallId,
            approved: part.approval?.status === 'approved',
            descriptor: part.approval?.descriptor,
            reason: part.approval?.reason,
        },
    };
}

function toolOutputAvailableToAi(part: ChatToolPart): AiMessagePart {
    return {
        ...toolBaseToAi(part),
        state: 'output-available',
        input: part.input,
        output: part.output,
        preliminary: part.preliminary,
        ...(part.approval?.status === 'approved'
            ? { approval: { id: part.approval.approvalId, approved: true as const, descriptor: part.approval.descriptor } }
            : {}),
    };
}

function toolOutputErrorToAi(part: ChatToolPart): AiMessagePart {
    return {
        ...toolBaseToAi(part),
        state: 'output-error',
        input: part.input,
        errorText: part.errorText ?? 'Tool execution failed',
    };
}

function toolOutputDeniedToAi(part: ChatToolPart): AiMessagePart {
    return {
        ...toolBaseToAi(part),
        state: 'output-denied',
        input: part.input,
        approval: {
            id: part.approval?.approvalId ?? part.toolCallId,
            approved: false as const,
            descriptor: part.approval?.descriptor,
            reason: part.approval?.reason,
        },
    };
}

const toolPartToAiByState: Record<ChatToolState, (part: ChatToolPart) => AiMessagePart> = {
    inputStreaming: toolInputStreamingToAi,
    inputAvailable: toolInputAvailableToAi,
    approvalRequested: toolApprovalRequestedToAi,
    approvalResponded: toolApprovalRespondedToAi,
    outputAvailable: toolOutputAvailableToAi,
    outputError: toolOutputErrorToAi,
    outputDenied: toolOutputDeniedToAi,
};

function partToAi(part: ChatMessagePart): AiMessagePart {
    if (part.type === 'stepStart') return { type: 'step-start' };
    if (part.type === 'text' || part.type === 'reasoning') {
        return {
            type: part.type,
            ...(part.type === 'reasoning' ? { id: part.partId } : {}),
            text: part.text,
            state: part.state,
            providerMetadata: providerMetadataToAi(part.metadata),
        };
    }
    if (part.type === 'sourceUrl') {
        return {
            type: 'source-url',
            sourceId: part.sourceId,
            url: part.url,
            title: part.title,
            providerMetadata: providerMetadataToAi(part.metadata),
        };
    }
    if (part.type === 'sourceDocument') {
        return {
            type: 'source-document',
            sourceId: part.sourceId,
            mediaType: part.mediaType,
            title: part.title,
            filename: part.filename,
            providerMetadata: providerMetadataToAi(part.metadata),
        };
    }
    if (part.type === 'file') {
        return {
            type: 'file',
            mediaType: part.mediaType,
            filename: part.filename,
            url: part.url,
            providerMetadata: providerMetadataToAi(part.metadata),
        };
    }
    if (part.type === 'data') {
        return { type: `data-${part.dataType}`, data: part.data };
    }
    return toolPartToAiByState[part.state](part);
}

function chatMessageBodyToAi(message: ChatMessageBody): UIMessage {
    return {
        id: message.id,
        role: message.role,
        parts: message.parts.map((part) => partToAi(part)),
        metadata: message.metadata,
    };
}

/** Convert persisted message bodies into AI SDK `ModelMessage[]` for agent replay. */
export async function chatMessageBodiesToModelMessages(messages: ChatMessageBody[]): Promise<ModelMessage[]> {
    return convertToModelMessages(messages.map((message) => chatMessageBodyToAi(message)));
}

/** Adapt an AI SDK UI message stream into durable `ChatMessageBody` snapshots. */
export function chatMessageBodyUpdatesFromAiStream({
    initialMessage,
    stream,
}: {
    initialMessage: ChatMessageBody;
    stream: ReadableStream<UIMessageChunk>;
}): AsyncIterable<ChatMessageBody> {
    return {
        async *[Symbol.asyncIterator]() {
            for await (const message of readUIMessageStream({
                message: chatMessageBodyToAi(initialMessage),
                stream,
                terminateOnError: true,
            })) {
                yield chatMessageBodyFromAi(message);
            }
        },
    };
}
