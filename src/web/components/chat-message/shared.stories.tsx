import type { Meta, StoryObj } from '@storybook/react-vite';

import { Bubble, CopyButton, MessageRow, Timestamp } from './shared';

const meta = {
    title: 'Chat/Atoms',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const MessageRows: Story = {
    render: () => (
        <div className="flex max-w-md flex-col gap-4">
            <MessageRow side="user">
                <span className="text-xs text-muted-foreground">user (end)</span>
            </MessageRow>
            <MessageRow side="assistant">
                <span className="text-xs text-muted-foreground">assistant (start)</span>
            </MessageRow>
            <MessageRow side="milestone">
                <span className="rounded-full bg-muted px-3 py-1 text-xs">milestone (center)</span>
            </MessageRow>
            <MessageRow side="system">
                <span className="text-xs text-muted-foreground">system (start)</span>
            </MessageRow>
        </div>
    ),
};

export const Bubbles: Story = {
    render: () => (
        <div className="flex max-w-md flex-col gap-6">
            <MessageRow side="user">
                <Bubble tone="user" tail>
                    Own message with tail
                </Bubble>
            </MessageRow>
            <MessageRow side="user">
                <Bubble tone="user" tail={false}>
                    Own message, no tail (mid streak)
                </Bubble>
            </MessageRow>
            <MessageRow side="assistant">
                <Bubble tone="assistant" tail>
                    Peer message with tail
                </Bubble>
            </MessageRow>
            <MessageRow side="assistant">
                <Bubble tone="assistant" tail={false}>
                    Peer message, no tail (mid streak)
                </Bubble>
            </MessageRow>
        </div>
    ),
};

export const TimestampDemo: Story = {
    render: () => (
        <div className="max-w-xs rounded-lg bg-muted/40 p-4">
            <p className="text-sm">Message body</p>
            <Timestamp iso="2026-10-18T15:30:00.000Z" />
        </div>
    ),
};

export const CopyButtonDemo: Story = {
    render: () => <CopyButton text="Hallo from Storybook" />,
};
