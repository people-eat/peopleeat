import type { ChatMessage, ChatTurn, FileUpload } from '../db/schema';
import type { ChatMessagePart, ChatToolApproval, ChatToolState } from '../domain/chatMessageBody';
import type { ChatTurnAggregate } from '../domain/chatTurn';
import { chatMessageBodyRead } from '../domain/chatTurn';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type {
    GqlSChatMessage,
    GqlSChatMessagePart,
    GqlSChatMessageStatus,
    GqlSChatToolApproval,
    GqlSChatToolState,
    GqlSChatTurn,
    GqlSChatTurnStatus,
} from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

const turnStatusToGql: Record<ChatTurn['status'], GqlSChatTurnStatus> = {
    queued: 'QUEUED',
    running: 'RUNNING',
    awaitingInput: 'AWAITING_INPUT',
    complete: 'COMPLETE',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
};

const messageStatusToGql: Record<ChatMessage['status'], GqlSChatMessageStatus> = {
    pending: 'PENDING',
    streaming: 'STREAMING',
    complete: 'COMPLETE',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
};

const toolStateToGql: Record<ChatToolState, GqlSChatToolState> = {
    inputStreaming: 'INPUT_STREAMING',
    inputAvailable: 'INPUT_AVAILABLE',
    approvalRequested: 'APPROVAL_REQUESTED',
    approvalResponded: 'APPROVAL_RESPONDED',
    outputAvailable: 'OUTPUT_AVAILABLE',
    outputError: 'OUTPUT_ERROR',
    outputDenied: 'OUTPUT_DENIED',
};

function approvalToGql(approval: ChatToolApproval | undefined): GqlSChatToolApproval | null {
    if (!approval) return null;
    const status: Record<ChatToolApproval['status'], GqlSChatToolApproval['status']> = {
        requested: 'REQUESTED',
        approved: 'APPROVED',
        denied: 'DENIED',
    };
    return {
        approvalId: approval.approvalId,
        status: status[approval.status],
        descriptor: approval.descriptor ?? null,
        reason: approval.reason ?? null,
    };
}

function toolPartToGql(
    message: ChatMessage,
    part: Extract<ChatMessagePart, { type: 'tool' }>,
    index: number,
    includeDebug: boolean,
): GqlSChatMessagePart {
    return {
        gqlTypeName: 'ChatMessageToolPart',
        partId: `${message.chatMessageId}:${index}`,
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        title: part.title ?? null,
        state: toolStateToGql[part.state],
        providerExecuted: part.providerExecuted ?? false,
        preliminary: part.preliminary ?? false,
        approval: approvalToGql(part.approval),
        debug: includeDebug
            ? {
                  input: part.input ?? null,
                  output: part.output ?? null,
                  errorText: part.errorText ?? null,
              }
            : null,
    };
}

function partToGql(message: ChatMessage, part: ChatMessagePart, index: number, includeDebug: boolean): GqlSChatMessagePart | null {
    const partId = `${message.chatMessageId}:${index}`;
    if (part.type === 'stepStart') return null;
    if (part.type === 'text') {
        return {
            gqlTypeName: 'ChatMessageTextPart',
            partId,
            state: part.state === 'streaming' ? 'STREAMING' : 'DONE',
            text: part.text,
        };
    }
    if (part.type === 'reasoning') {
        return {
            gqlTypeName: 'ChatMessageReasoningPart',
            partId,
            state: part.state === 'streaming' ? 'STREAMING' : 'DONE',
            text: part.text,
        };
    }
    if (part.type === 'sourceUrl') {
        return {
            gqlTypeName: 'ChatMessageSourceUrlPart',
            partId,
            sourceId: part.sourceId,
            url: part.url,
            title: part.title ?? null,
        };
    }
    if (part.type === 'sourceDocument') {
        return {
            gqlTypeName: 'ChatMessageSourceDocumentPart',
            partId,
            sourceId: part.sourceId,
            mediaType: part.mediaType,
            title: part.title,
            filename: part.filename ?? null,
        };
    }
    if (part.type === 'file') {
        return {
            gqlTypeName: 'ChatMessageFilePart',
            partId,
            mediaType: part.mediaType,
            filename: part.filename ?? null,
            url: part.url,
        };
    }
    if (part.type === 'tool') {
        return toolPartToGql(message, part, index, includeDebug);
    }
    return {
        gqlTypeName: 'ChatMessageDataPart',
        partId,
        dataType: part.dataType,
        data: part.data,
    };
}

function messageToGql(message: ChatMessage, includeDebug: boolean, attachments: FileUpload[] = []): GqlSChatMessage {
    const body = chatMessageBodyRead(message);
    return {
        chatMessageId: message.chatMessageId,
        chatTurnId: message.chatTurnId,
        role: message.role === 'user' ? 'USER' : 'ASSISTANT',
        status: messageStatusToGql[message.status],
        revision: message.revision,
        parts: body.parts
            .map((part, index) => partToGql(message, part, index, includeDebug))
            .filter((part): part is GqlSChatMessagePart => part !== null),
        attachments: message.role === 'user' ? attachments.map(toGqlFileUpload) : [],
        createdAt: message.createdAt,
        lastModifiedAt: message.lastModifiedAt,
    };
}

export function toGqlChatTurn(
    aggregate: ChatTurnAggregate,
    { includeDebug, userAttachments = [] }: { includeDebug: boolean; userAttachments?: FileUpload[] },
): GqlSChatTurn {
    return {
        chatTurnId: aggregate.turn.chatTurnId,
        sequence: aggregate.turn.sequence,
        status: turnStatusToGql[aggregate.turn.status],
        revision: aggregate.turn.revision,
        locale: aggregate.turn.locale ?? null,
        userMessage: messageToGql(aggregate.userMessage, includeDebug, userAttachments),
        assistantMessage: messageToGql(aggregate.assistantMessage, includeDebug),
        failure: aggregate.turn.failureCode ? { code: aggregate.turn.failureCode } : null,
        debug: includeDebug
            ? {
                  agentName: aggregate.turn.agentName,
                  modelId: aggregate.turn.modelId,
                  finishReason: aggregate.turn.finishReason,
                  usage: aggregate.turn.usage,
              }
            : null,
        createdAt: aggregate.turn.createdAt,
        startedAt: aggregate.turn.startedAt,
        completedAt: aggregate.turn.completedAt,
        lastModifiedAt: aggregate.turn.lastModifiedAt,
    };
}

export function chatDebugEnabled(): boolean {
    return environmentVariables.chatDebugEnabled;
}
