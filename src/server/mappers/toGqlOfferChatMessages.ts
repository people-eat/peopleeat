import type { BookingRequestOfferEvent, FileUpload } from '../db/schema';
import type { BookingRequestOfferEventType } from '../domain/bookingRequest';
import type { GqlSChatMessageBookingRequestOfferEventType, GqlSHumanChatMessage, GqlSPublicUser } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

export type OfferChatViewerRole = 'user' | 'cook' | 'admin';

export type ToGqlOfferChatMessagesInput = {
    events: ReadonlyArray<BookingRequestOfferEvent>;
    customer: GqlSPublicUser;
    cook: GqlSPublicUser;
    viewerRole: OfferChatViewerRole;
    /** Send-ordered FileUploads keyed by MESSAGE_SIMPLE event id. */
    attachmentsByEventId?: ReadonlyMap<string, ReadonlyArray<FileUpload>>;
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
};

/** Project offer timeline events onto the human chat message union. */
export function toGqlOfferChatMessages(input: ToGqlOfferChatMessagesInput): GqlSHumanChatMessage[] {
    return input.events.map((event) => toGqlOfferChatMessage(event, input));
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

function toGqlOfferChatMessageUser(event: BookingRequestOfferEvent, input: ToGqlOfferChatMessagesInput): GqlSHumanChatMessage {
    const payload = event.payload as MessageSimplePayload;
    const { author, isOwn } = authorAndIsOwnForMessageSimple(event.type, payload, input);
    const attachments = input.attachmentsByEventId?.get(event.bookingRequestOfferEventId) ?? [];
    return {
        gqlTypeName: 'ChatMessageUser',
        chatMessageId: event.bookingRequestOfferEventId,
        author,
        isOwn,
        showCopyButton: false,
        collapseLongBody: false,
        body: payload.messageBody,
        attachments: attachments.map(toGqlFileUpload),
        deliveryStatus: null,
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
