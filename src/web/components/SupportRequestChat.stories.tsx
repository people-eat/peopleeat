import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { chatViewportDecorator } from '../../../.storybook/decorators';
import { fixtureSupportChatTranscript } from '../storybook/fixtures/chat';
import { fixtureAvatarCustomer, fixtureCustomer } from '../storybook/fixtures/people';
import { SupportRequestChat } from './SupportRequestChat';

const onSend = fn(async () => true);

const meta = {
    title: 'Chat/Support Surface',
    tags: ['autodocs'],
    decorators: [chatViewportDecorator],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTranscript: Story = {
    render: () => (
        <SupportRequestChat
            className="h-full min-h-0"
            messages={fixtureSupportChatTranscript}
            canSend
            onSend={onSend}
            peerDisplay={fixtureCustomer.display}
            profilePictureUrl={fixtureAvatarCustomer}
        />
    ),
};

export const AdminDetail: Story = {
    render: () => (
        <SupportRequestChat
            className="h-full min-h-0"
            messages={fixtureSupportChatTranscript}
            canSend
            onSend={onSend}
            peerDisplay={fixtureCustomer.display}
            profilePictureUrl={fixtureAvatarCustomer}
            customerUserId={fixtureCustomer.userId}
            subtitle={null}
            context={<span className="text-sm font-medium text-foreground">Booking #BR-2048</span>}
        />
    ),
};

export const Empty: Story = {
    render: () => (
        <SupportRequestChat
            className="h-full min-h-0"
            messages={[]}
            canSend
            onSend={onSend}
            peerDisplay={fixtureCustomer.display}
            profilePictureUrl={fixtureAvatarCustomer}
        />
    ),
};
