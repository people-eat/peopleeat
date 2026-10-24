import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { buildAttachments, chatMessageUserFixture } from '../../storybook/fixtures/chat';
import { ChatMessageUserView } from './ChatMessageUser';

const moderationStubs = {
    onEdit: fn(async () => true),
    onVisibilityChange: fn(async () => true),
    onDelete: fn(async () => true),
    onReact: fn(async () => true),
};

const meta = {
    title: 'Chat/Message User',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnShort: Story = {
    render: () => (
        <div className="max-w-md">
            <ChatMessageUserView
                message={chatMessageUserFixture({
                    isOwn: true,
                    body: 'Klingt gut, danke!',
                    createdAt: '2026-10-18T15:12:00.000Z',
                })}
            />
        </div>
    ),
};

export const PeerStreak: Story = {
    render: () => (
        <div className="flex max-w-md flex-col gap-1">
            <ChatMessageUserView
                message={chatMessageUserFixture({
                    chatMessageId: 'msgPeerStreakFirst',
                    isOwn: false,
                    body: 'Hallo Anna, schön dass ihr bucht.',
                    createdAt: '2026-10-18T15:08:00.000Z',
                })}
                showAuthorName
                showAuthorAvatar={false}
            />
            <ChatMessageUserView
                message={chatMessageUserFixture({
                    chatMessageId: 'msgPeerStreakMid',
                    isOwn: false,
                    body: 'Ich habe ein Herbstmenü im Kopf.',
                    createdAt: '2026-10-18T15:08:30.000Z',
                })}
                showAuthorName={false}
                showAuthorAvatar={false}
            />
            <ChatMessageUserView
                message={chatMessageUserFixture({
                    chatMessageId: 'msgPeerStreakLast',
                    isOwn: false,
                    body: 'Passt 18:30 Uhr für euch?',
                    createdAt: '2026-10-18T15:09:00.000Z',
                })}
                showAuthorName={false}
                showAuthorAvatar
            />
        </div>
    ),
};

export const WithReactions: Story = {
    render: () => (
        <div className="max-w-md">
            <ChatMessageUserView
                message={chatMessageUserFixture({
                    isOwn: false,
                    body: 'Super, dann reserviere ich den Termin.',
                    reactions: [
                        { emoji: '👍', isOwn: true },
                        { emoji: '❤️', isOwn: false },
                    ],
                })}
                onReact={moderationStubs.onReact}
            />
        </div>
    ),
};

export const WithAttachments: Story = {
    render: () => (
        <div className="max-w-md">
            <ChatMessageUserView
                message={chatMessageUserFixture({
                    isOwn: true,
                    body: 'Hier sind Fotos vom letzten Event.',
                    attachments: buildAttachments(3),
                })}
            />
        </div>
    ),
};

export const HiddenByAdmin: Story = {
    render: () => (
        <div className="max-w-md">
            <ChatMessageUserView
                message={chatMessageUserFixture({
                    isOwn: false,
                    hiddenByAdmin: true,
                    body: 'Diese Nachricht ist für Gäste ausgeblendet.',
                })}
                onVisibilityChange={moderationStubs.onVisibilityChange}
            />
        </div>
    ),
};

export const AdminModeration: Story = {
    render: () => (
        <div className="max-w-md">
            <ChatMessageUserView
                message={chatMessageUserFixture({
                    isOwn: false,
                    canHardDelete: true,
                    body: 'Nachricht mit Admin-Aktionen.',
                })}
                onEdit={moderationStubs.onEdit}
                onVisibilityChange={moderationStubs.onVisibilityChange}
                onDelete={moderationStubs.onDelete}
            />
        </div>
    ),
};
