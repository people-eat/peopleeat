import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { buildAttachments } from '../../storybook/fixtures/chat';
import { ChatAttachmentPreviewDialog } from './ChatAttachmentPreviewDialog';
import { ChatAttachmentTileGrid } from './ChatAttachmentTileGrid';

const meta = {
    title: 'Chat/Attachments',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneAttachment: Story = {
    render: () => (
        <div className="max-w-xs">
            <ChatAttachmentTileGrid attachments={buildAttachments(1)} onTileClick={fn()} />
        </div>
    ),
};

export const FourAttachments: Story = {
    render: () => (
        <div className="max-w-xs">
            <ChatAttachmentTileGrid attachments={buildAttachments(4)} onTileClick={fn()} />
        </div>
    ),
};

export const SevenAttachments: Story = {
    render: () => (
        <div className="max-w-xs">
            <ChatAttachmentTileGrid attachments={buildAttachments(7)} onTileClick={fn()} />
        </div>
    ),
};

function PreviewDialogDemo() {
    const attachments = buildAttachments(7);
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);

    return (
        <div className="max-w-xs">
            <ChatAttachmentTileGrid
                attachments={attachments}
                onTileClick={(nextIndex) => {
                    setIndex(nextIndex);
                    setOpen(true);
                }}
            />
            <ChatAttachmentPreviewDialog
                open={open}
                onOpenChange={setOpen}
                attachments={attachments}
                index={index}
                onIndexChange={setIndex}
            />
        </div>
    );
}

export const WithPreviewDialog: Story = {
    render: () => <PreviewDialogDemo />,
};
