import type {
    GqlCChatMessageBookingRequestOfferEvent,
    GqlCChatMessageUser,
    GqlCFileUpload,
    GqlCHumanChatMessageFieldsFragment,
} from '../../graphql/generated';
import { fixtureAvatarCook, fixtureAvatarCustomer, fixtureCook, fixtureCustomer } from './people';

function fileUploadFixture(
    overrides: Partial<GqlCFileUpload> & Pick<GqlCFileUpload, 'fileUploadId' | 'filename' | 'mediaType'> = {
        fileUploadId: 'fileFixture000000001',
        filename: 'menu.png',
        mediaType: 'image/png',
    },
): GqlCFileUpload {
    return {
        __typename: 'FileUpload',
        fileUploadId: overrides.fileUploadId,
        filename: overrides.filename,
        mediaType: overrides.mediaType,
        size: overrides.size ?? 2048,
        url: overrides.url ?? `/api/file-uploads/${overrides.fileUploadId}`,
    };
}

export function buildAttachments(count: number): GqlCFileUpload[] {
    return Array.from({ length: count }, (_, index) =>
        fileUploadFixture({
            fileUploadId: `attFixture${String(index).padStart(10, '0')}`,
            filename: index % 2 === 0 ? `pic-${index}.png` : `doc-${index}.pdf`,
            mediaType: index % 2 === 0 ? 'image/png' : 'application/pdf',
            url:
                index % 2 === 0
                    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect fill="#${['5c7a6a', '8a6b4a', '4a5c8a', 'c4a06a'][index % 4]}" width="320" height="240"/></svg>`)}`
                    : `/api/file-uploads/att-${index}`,
        }),
    );
}

type ChatMessageUserFixtureInput = {
    chatMessageId?: string;
    body?: string;
    isOwn?: boolean;
    authorDisplay?: string;
    authorPictureUrl?: string | null;
    createdAt?: string;
    attachments?: GqlCFileUpload[];
    reactions?: Array<{ emoji: string; isOwn: boolean }>;
    hiddenByAdmin?: boolean;
    canHardDelete?: boolean;
    collapseLongBody?: boolean;
    showCopyButton?: boolean;
    deliveryStatus?: GqlCChatMessageUser['deliveryStatus'];
};

export function chatMessageUserFixture(input: ChatMessageUserFixtureInput = {}): GqlCChatMessageUser {
    const isOwn = input.isOwn ?? false;
    const display = input.authorDisplay ?? (isOwn ? fixtureCustomer.display : fixtureCook.display);
    const pictureUrl = input.authorPictureUrl !== undefined ? input.authorPictureUrl : isOwn ? fixtureAvatarCustomer : fixtureAvatarCook;

    return {
        __typename: 'ChatMessageUser',
        chatMessageId: input.chatMessageId ?? 'msgUserFixture0000001',
        body: input.body ?? 'Hallo! Wir freuen uns auf das Dinner.',
        createdAt: input.createdAt ?? '2026-10-18T15:00:00.000Z',
        isOwn,
        showCopyButton: input.showCopyButton ?? true,
        collapseLongBody: input.collapseLongBody ?? false,
        hiddenByAdmin: input.hiddenByAdmin ?? false,
        canHardDelete: input.canHardDelete ?? false,
        deliveryStatus: input.deliveryStatus ?? 'DELIVERED',
        reactions: input.reactions ?? [],
        author: {
            __typename: 'PublicUser',
            display,
            createdAt: '2025-01-01T00:00:00.000Z',
            profilePicture:
                pictureUrl != null
                    ? fileUploadFixture({
                          fileUploadId: 'avatarFixture0000001',
                          filename: 'avatar.png',
                          mediaType: 'image/png',
                          url: pictureUrl,
                      })
                    : null,
        },
        attachments: input.attachments ?? [],
    };
}

export function chatOfferEventFixture(
    type: GqlCChatMessageBookingRequestOfferEvent['type'],
    overrides: Partial<GqlCChatMessageBookingRequestOfferEvent> = {},
): GqlCChatMessageBookingRequestOfferEvent {
    return {
        __typename: 'ChatMessageBookingRequestOfferEvent',
        chatMessageId: overrides.chatMessageId ?? `msgEvent${type.slice(0, 8)}`,
        createdAt: overrides.createdAt ?? '2026-10-18T14:00:00.000Z',
        type,
        payload: overrides.payload ?? {},
    };
}

/** Fragment shape used by offer / support chat surfaces. */
export function humanChatMessageUserFragment(
    input: ChatMessageUserFixtureInput = {},
): Extract<GqlCHumanChatMessageFieldsFragment, { __typename: 'ChatMessageUser' }> {
    const message = chatMessageUserFixture(input);
    return {
        __typename: 'ChatMessageUser',
        chatMessageId: message.chatMessageId,
        body: message.body,
        createdAt: message.createdAt,
        isOwn: message.isOwn,
        showCopyButton: message.showCopyButton,
        collapseLongBody: message.collapseLongBody,
        hiddenByAdmin: message.hiddenByAdmin,
        canHardDelete: message.canHardDelete,
        deliveryStatus: message.deliveryStatus ?? null,
        reactions: message.reactions.map((reaction) => ({ emoji: reaction.emoji, isOwn: reaction.isOwn })),
        author: {
            display: message.author.display,
            createdAt: message.author.createdAt,
            profilePicture: message.author.profilePicture
                ? {
                      fileUploadId: message.author.profilePicture.fileUploadId,
                      filename: message.author.profilePicture.filename,
                      mediaType: message.author.profilePicture.mediaType,
                      size: message.author.profilePicture.size,
                      url: message.author.profilePicture.url,
                  }
                : null,
        },
        attachments: message.attachments.map((attachment) => ({
            fileUploadId: attachment.fileUploadId,
            filename: attachment.filename,
            mediaType: attachment.mediaType,
            size: attachment.size,
            url: attachment.url,
        })),
    };
}

function humanChatOfferEventFragment(
    type: GqlCChatMessageBookingRequestOfferEvent['type'],
    payload: unknown = {},
    createdAt = '2026-10-18T14:00:00.000Z',
): Extract<GqlCHumanChatMessageFieldsFragment, { __typename: 'ChatMessageBookingRequestOfferEvent' }> {
    return {
        __typename: 'ChatMessageBookingRequestOfferEvent',
        chatMessageId: `msgEventFrag${type.slice(0, 6)}`,
        type,
        payload,
        createdAt,
    };
}

export const fixtureOfferChatTranscript: GqlCHumanChatMessageFieldsFragment[] = [
    humanChatOfferEventFragment('COOK_CREATED'),
    humanChatMessageUserFragment({
        chatMessageId: 'msgOwn00000000000001',
        isOwn: true,
        body: 'Hallo Mara, wir sind eine Gruppe von sechs und freuen uns auf euer Menü.',
        createdAt: '2026-10-18T15:05:00.000Z',
    }),
    humanChatMessageUserFragment({
        chatMessageId: 'msgPeer0000000000001',
        isOwn: false,
        body: 'Super! Ich schlage ein Herbstmenü mit vegetarischer Option vor.',
        createdAt: '2026-10-18T15:08:00.000Z',
        reactions: [{ emoji: '👍', isOwn: true }],
    }),
    humanChatMessageUserFragment({
        chatMessageId: 'msgPeer0000000000002',
        isOwn: false,
        body: 'Passt 18:30 Uhr für euch als Ankunftszeit?',
        createdAt: '2026-10-18T15:09:00.000Z',
    }),
    humanChatOfferEventFragment('COOK_UPDATED_SUGGESTED_MENU', {}, '2026-10-18T16:00:00.000Z'),
];

export const fixtureSupportChatTranscript: GqlCHumanChatMessageFieldsFragment[] = [
    humanChatMessageUserFragment({
        chatMessageId: 'msgSupport0000000001',
        isOwn: true,
        authorDisplay: fixtureCustomer.display,
        authorPictureUrl: fixtureAvatarCustomer,
        body: 'Könnt ihr bestätigen, dass der Koch eine Stunde früher ankommt?',
        createdAt: '2026-10-19T09:00:00.000Z',
    }),
    humanChatMessageUserFragment({
        chatMessageId: 'msgSupport0000000002',
        isOwn: false,
        authorDisplay: 'Support peopleeat',
        authorPictureUrl: null,
        body: 'Klar, wir klären das mit dem Koch und melden uns.',
        createdAt: '2026-10-19T09:12:00.000Z',
    }),
];
