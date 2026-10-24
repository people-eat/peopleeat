import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { chatViewportDecorator } from '../../../.storybook/decorators';
import { humanChatMessageUserFragment } from '../storybook/fixtures/chat';
import { fixtureAvatarCustomer, fixtureCustomer } from '../storybook/fixtures/people';
import { WhatsAppConversationChat } from './WhatsAppConversationChat';

const fixtureWhatsAppTranscript = [
    humanChatMessageUserFragment({
        chatMessageId: 'msgWaOwn0000000001',
        isOwn: true,
        body: 'Hallo! Könnt ihr den Kochtermin bestätigen?',
        createdAt: '2026-10-20T08:00:00.000Z',
    }),
    humanChatMessageUserFragment({
        chatMessageId: 'msgWaPeer000000001',
        isOwn: false,
        authorDisplay: 'Concierge Juliana',
        authorPictureUrl: '/concierge-juliana.webp',
        body: 'Ja, Mara Keller ist für den 14.11. eingeplant. Soll ich euch die Menüdetails schicken?',
        createdAt: '2026-10-20T08:05:00.000Z',
        reactions: [{ emoji: '👍', isOwn: true }],
    }),
    humanChatMessageUserFragment({
        chatMessageId: 'msgWaOwn0000000002',
        isOwn: true,
        body: 'Super, bitte schickt uns das Menü.',
        createdAt: '2026-10-20T08:07:00.000Z',
    }),
];

const onSend = fn(async () => true);
const onReact = fn(async () => true);

const meta = {
    title: 'Chat/WhatsApp Surface',
    tags: ['autodocs'],
    decorators: [chatViewportDecorator],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveWindow: Story = {
    render: () => (
        <WhatsAppConversationChat
            className="h-full min-h-0"
            messages={fixtureWhatsAppTranscript}
            canSend
            onSend={onSend}
            onReact={onReact}
            peerDisplay={fixtureCustomer.display}
            profilePictureUrl={fixtureAvatarCustomer}
            customerUserId={fixtureCustomer.userId}
        />
    ),
};

export const ClosedWindow: Story = {
    render: () => (
        <WhatsAppConversationChat
            className="h-full min-h-0"
            messages={fixtureWhatsAppTranscript}
            canSend={false}
            onSend={onSend}
            onReact={onReact}
            peerDisplay={fixtureCustomer.display}
            profilePictureUrl={fixtureAvatarCustomer}
            customerUserId={fixtureCustomer.userId}
        />
    ),
};

export const Empty: Story = {
    render: () => (
        <WhatsAppConversationChat
            className="h-full min-h-0"
            messages={[]}
            canSend
            onSend={onSend}
            onReact={onReact}
            peerDisplay={fixtureCustomer.display}
            profilePictureUrl={fixtureAvatarCustomer}
            customerUserId={null}
        />
    ),
};
