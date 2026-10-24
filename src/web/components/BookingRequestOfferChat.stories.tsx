import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { chatViewportDecorator, withFeatureToggles } from '../../../.storybook/decorators';
import { fixtureOfferChatTranscript } from '../storybook/fixtures/chat';
import { fixtureAvatarCook, fixtureAvatarCustomer, fixtureCook, fixtureCustomer } from '../storybook/fixtures/people';
import { BookingRequestOfferChat } from './BookingRequestOfferChat';

const onSend = fn(async () => true);
const onReactMessage = fn(async () => true);
const onEditMessage = fn(async () => true);
const onVisibilityChangeMessage = fn(async () => true);
const onDeleteMessage = fn(async () => true);

const customerPeers = [{ display: fixtureCook.display, profilePictureUrl: fixtureAvatarCook }];

const cookPeers = [{ display: fixtureCustomer.display, profilePictureUrl: fixtureAvatarCustomer }];

const adminPeers = [
    { display: fixtureCustomer.display, profilePictureUrl: fixtureAvatarCustomer, userId: fixtureCustomer.userId },
    { display: fixtureCook.display, profilePictureUrl: fixtureAvatarCook, userId: fixtureCook.userId },
];

const meta = {
    title: 'Chat/Offer Surface',
    tags: ['autodocs'],
    decorators: [chatViewportDecorator, withFeatureToggles(['BOOKING_REQUEST_OFFER_CHAT_REACTIONS'])],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Customer: Story = {
    render: () => (
        <BookingRequestOfferChat
            className="h-full min-h-0"
            messages={fixtureOfferChatTranscript}
            canSend
            viewerRole="customer"
            peers={customerPeers}
            onSend={onSend}
            onReactMessage={onReactMessage}
        />
    ),
};

export const Cook: Story = {
    render: () => (
        <BookingRequestOfferChat
            className="h-full min-h-0"
            messages={fixtureOfferChatTranscript}
            canSend
            viewerRole="cook"
            peers={cookPeers}
            onSend={onSend}
            onReactMessage={onReactMessage}
        />
    ),
};

export const AdminReadOnly: Story = {
    render: () => (
        <BookingRequestOfferChat
            className="h-full min-h-0"
            messages={fixtureOfferChatTranscript}
            canSend={false}
            viewerRole="admin"
            peers={adminPeers}
            onSend={onSend}
            onEditMessage={onEditMessage}
            onVisibilityChangeMessage={onVisibilityChangeMessage}
            onDeleteMessage={onDeleteMessage}
            onReactMessage={onReactMessage}
        />
    ),
};
