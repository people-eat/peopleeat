import type { Meta, StoryObj } from '@storybook/react-vite';

import { chatViewportDecorator } from '../../../../.storybook/decorators';
import { useLocale } from '../../hooks/useLocale';
import { Bubble, MessageRow } from '../chat-message/shared';
import { ChatTranscriptShell } from './chat-transcript-shell';
import { MessageScrollerItem } from './message-scroller';

function TranscriptDemo({ mode }: { mode: 'assistant' | 'human' }) {
    const locale = useLocale();
    const jumpLabel = { de: 'Zum neuesten springen', en: 'Jump to latest' }[locale];

    return (
        <ChatTranscriptShell mode={mode} jumpToLatestLabel={jumpLabel} contentClassName="w-full gap-3" className="min-h-0 flex-1">
            <MessageScrollerItem>
                <MessageRow side="assistant">
                    <Bubble tone="assistant">Welcome! How can I help with your booking?</Bubble>
                </MessageRow>
            </MessageScrollerItem>
            <MessageScrollerItem>
                <MessageRow side="user">
                    <Bubble tone="user">We need a chef for six guests in Munich.</Bubble>
                </MessageRow>
            </MessageScrollerItem>
            <MessageScrollerItem>
                <MessageRow side="assistant">
                    <Bubble tone="assistant">I can suggest a few cooks. Any cuisine preferences?</Bubble>
                </MessageRow>
            </MessageScrollerItem>
            <MessageScrollerItem>
                <MessageRow side="user">
                    <Bubble tone="user">Italian or modern European would be perfect.</Bubble>
                </MessageRow>
            </MessageScrollerItem>
        </ChatTranscriptShell>
    );
}

function EmptyTranscript() {
    const locale = useLocale();
    const jumpLabel = { de: 'Zum neuesten springen', en: 'Jump to latest' }[locale];

    return (
        <ChatTranscriptShell mode="human" jumpToLatestLabel={jumpLabel} contentClassName="w-full gap-3" className="min-h-0 flex-1">
            <MessageScrollerItem>
                <p className="flex min-h-48 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    {{ de: 'Noch keine Nachrichten.', en: 'No messages yet.' }[locale]}
                </p>
            </MessageScrollerItem>
        </ChatTranscriptShell>
    );
}

const meta = {
    title: 'Chat/Transcript Shell',
    tags: ['autodocs'],
    decorators: [chatViewportDecorator],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AssistantMode: Story = {
    render: () => (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <TranscriptDemo mode="assistant" />
        </div>
    ),
};

export const HumanMode: Story = {
    render: () => (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <TranscriptDemo mode="human" />
        </div>
    ),
};

export const Empty: Story = {
    render: () => (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <EmptyTranscript />
        </div>
    ),
};
