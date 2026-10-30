import type { FileUploadMetadata } from '../db/fileUploadMetadata';
import type { BookingRequestOfferEvent, BookingRequestOfferEventReaction } from '../db/schema';
import type { BookingRequestOfferChatReactorRole, BookingRequestOfferEventType } from '../domain/bookingRequest';
import { bookingRequestOfferEventTypeAdminOnlySet } from '../domain/bookingRequest';
import type {
    GqlSChatMessageBookingRequestOfferEventType,
    GqlSChatMessageReaction,
    GqlSHumanChatMessage,
    GqlSPublicUser,
} from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

export type OfferChatViewerRole = 'user' | 'cook' | 'admin';

export type ToGqlOfferChatMessagesInput = {
    events: ReadonlyArray<BookingRequestOfferEvent>;
    customer: GqlSPublicUser;
    cook: GqlSPublicUser;
    viewerRole: OfferChatViewerRole;
    /** Send-ordered file metadata keyed by MESSAGE_SIMPLE event id (no bytes). */
    attachmentsByEventId?: ReadonlyMap<string, ReadonlyArray<FileUploadMetadata>>;
    reactionsByEventId?: ReadonlyMap<string, ReadonlyArray<BookingRequestOfferEventReaction>>;
};

const MESSAGE_SIMPLE_TYPES = new Set<BookingRequestOfferEventType>(['USER_MESSAGE_SIMPLE', 'COOK_MESSAGE_SIMPLE', 'ADMIN_MESSAGE_SIMPLE']);

const ADMIN_PUBLIC_USER: GqlSPublicUser = {
    display: 'Admin',
    createdAt: new Date(0),
    profilePicture: null,
};

type MessageSimplePayload = {
    messageBody: string;
    originalCreatedAt?: string;
    handedOverFrom?: {
        cookId: string;
        cookDisplayName: string;
        sourceEventId: string;
    };
    hiddenByAdmin?: boolean;
};

function messageSimpleIsHiddenByAdmin(event: BookingRequestOfferEvent): boolean {
    if (!MESSAGE_SIMPLE_TYPES.has(event.type)) return false;
    const payload = event.payload as MessageSimplePayload;
    return payload.hiddenByAdmin === true;
}

/** Project offer timeline events onto the human chat message union. */
export function toGqlOfferChatMessages(input: ToGqlOfferChatMessagesInput): GqlSHumanChatMessage[] {
    return input.events.flatMap((event) => {
        if (input.viewerRole !== 'admin') {
            if (messageSimpleIsHiddenByAdmin(event)) return [];
            if (bookingRequestOfferEventTypeAdminOnlySet.has(event.type)) return [];
        }
        return [toGqlOfferChatMessage(event, input)];
    });
}

function toGqlOfferChatMessage(event: BookingRequestOfferEvent, input: ToGqlOfferChatMessagesInput): GqlSHumanChatMessage {
    if (MESSAGE_SIMPLE_TYPES.has(event.type)) {
        return toGqlOfferChatMessageUser(event, input);
    }
    return {
        gqlTypeName: 'ChatMessageBookingRequestOfferEvent',
        chatMessageId: event.bookingRequestOfferEventId,
        type: event.type as GqlSChatMessageBookingRequestOfferEventType,
        payload: event.payload,
        createdAt: event.createdAt,
    };
}

function reactorRoleIsOwn(reactorRole: BookingRequestOfferChatReactorRole, viewerRole: OfferChatViewerRole): boolean {
    switch (reactorRole) {
        case 'USER':
            return viewerRole === 'user';
        case 'COOK':
            return viewerRole === 'cook';
        case 'ADMIN':
            return viewerRole === 'admin';
    }
}

function reactionsResolve(
    rows: ReadonlyArray<BookingRequestOfferEventReaction> | undefined,
    viewerRole: OfferChatViewerRole,
): GqlSChatMessageReaction[] {
    if (!rows?.length) return [];
    return rows
        .filter((row): row is BookingRequestOfferEventReaction & { emoji: string } => Boolean(row.emoji?.trim()))
        .map((row) => ({
            emoji: row.emoji.trim(),
            isOwn: reactorRoleIsOwn(row.reactorRole, viewerRole),
        }));
}

function toGqlOfferChatMessageUser(event: BookingRequestOfferEvent, input: ToGqlOfferChatMessagesInput): GqlSHumanChatMessage {
    const payload = event.payload as MessageSimplePayload;
    const { author, isOwn } = authorAndIsOwnForMessageSimple(event.type, payload, input);
    const attachments = input.attachmentsByEventId?.get(event.bookingRequestOfferEventId) ?? [];
    const hiddenByAdmin = payload.hiddenByAdmin === true;
    const canHardDelete = input.viewerRole === 'admin' && event.type === 'ADMIN_MESSAGE_SIMPLE';
    return {
        gqlTypeName: 'ChatMessageUser',
        chatMessageId: event.bookingRequestOfferEventId,
        author,
        isOwn,
        showCopyButton: false,
        collapseLongBody: false,
        hiddenByAdmin,
        canHardDelete,
        body: payload.messageBody,
        attachments: attachments.map(toGqlFileUpload),
        deliveryStatus: null,
        reactions: reactionsResolve(input.reactionsByEventId?.get(event.bookingRequestOfferEventId), input.viewerRole),
        createdAt: createdAtForMessageSimple(event, payload),
    };
}

function createdAtForMessageSimple(event: BookingRequestOfferEvent, payload: MessageSimplePayload): Date {
    if (typeof payload.originalCreatedAt === 'string') {
        const original = new Date(payload.originalCreatedAt);
        if (!Number.isNaN(original.getTime())) {
            return original;
        }
    }
    return event.createdAt;
}

function authorAndIsOwnForMessageSimple(
    type: BookingRequestOfferEventType,
    payload: MessageSimplePayload,
    input: ToGqlOfferChatMessagesInput,
): { author: GqlSPublicUser; isOwn: boolean } {
    switch (type) {
        case 'USER_MESSAGE_SIMPLE':
            return { author: input.customer, isOwn: input.viewerRole === 'user' };
        case 'COOK_MESSAGE_SIMPLE': {
            if (payload.handedOverFrom) {
                return {
                    author: {
                        display: payload.handedOverFrom.cookDisplayName,
                        createdAt: new Date(0),
                        profilePicture: null,
                    },
                    isOwn: false,
                };
            }
            return { author: input.cook, isOwn: input.viewerRole === 'cook' };
        }
        case 'ADMIN_MESSAGE_SIMPLE':
            return { author: ADMIN_PUBLIC_USER, isOwn: input.viewerRole === 'admin' };
        default:
            throw new Error(`toGqlOfferChatMessages: unexpected message type ${type}`);
    }
}
