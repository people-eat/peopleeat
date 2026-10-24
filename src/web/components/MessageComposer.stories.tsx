import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import type { ComposerAttachment } from './message-composer-types';
import { MessageComposer } from './MessageComposer';

function composerAttachmentsFixture(): ComposerAttachment[] {
    return [
        {
            localId: 'att-local-1',
            file: new File(['pixels'], 'menu.png', { type: 'image/png' }),
            status: 'uploaded',
            fileUploadId: 'fileFixture000000001',
        },
        {
            localId: 'att-local-2',
            file: new File(['pdf'], 'allergies.pdf', { type: 'application/pdf' }),
            status: 'uploading',
        },
        {
            localId: 'att-local-3',
            file: new File([''], 'too-large.zip', { type: 'application/zip' }),
            status: 'error',
            error: 'Upload failed',
        },
    ];
}

const onSubmit = fn(async () => true);

const meta = {
    title: 'Chat/Composer',
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function IdleComposer() {
    const [value, setValue] = useState('');
    return <MessageComposer value={value} onValueChange={setValue} onSubmit={onSubmit} ariaLabel="Message" showDisclaimer={false} />;
}

function MultilineComposer() {
    const [value, setValue] = useState('Line one\nLine two\nLine three');
    return (
        <MessageComposer value={value} onValueChange={setValue} onSubmit={onSubmit} ariaLabel="Message" rows={3} showDisclaimer={false} />
    );
}

function BusyComposer() {
    const [value, setValue] = useState('Sending soon…');
    return <MessageComposer value={value} onValueChange={setValue} onSubmit={onSubmit} ariaLabel="Message" busy showDisclaimer={false} />;
}

function SubmittingComposer() {
    const [value, setValue] = useState('On the wire…');
    return (
        <MessageComposer value={value} onValueChange={setValue} onSubmit={onSubmit} ariaLabel="Message" submitting showDisclaimer={false} />
    );
}

function SendDisabledComposer() {
    const [value, setValue] = useState('Contains a blocked pattern');
    return (
        <MessageComposer
            value={value}
            onValueChange={setValue}
            onSubmit={onSubmit}
            ariaLabel="Message"
            sendDisabled
            showDisclaimer={false}
        />
    );
}

function AttachmentsComposer() {
    const [value, setValue] = useState('Photos attached');
    return (
        <MessageComposer
            value={value}
            onValueChange={setValue}
            onSubmit={onSubmit}
            ariaLabel="Message"
            showDisclaimer={false}
            attachments={composerAttachmentsFixture()}
            onAttachmentsAdd={fn()}
            onAttachmentRemove={fn()}
        />
    );
}

function NoPaperclipComposer() {
    const [value, setValue] = useState('');
    return (
        <MessageComposer
            value={value}
            onValueChange={setValue}
            onSubmit={onSubmit}
            ariaLabel="Message"
            showAttachButton={false}
            showDisclaimer={false}
        />
    );
}

export const Idle: Story = {
    render: () => <IdleComposer />,
};

export const Multiline: Story = {
    render: () => <MultilineComposer />,
};

export const Busy: Story = {
    render: () => <BusyComposer />,
};

export const Submitting: Story = {
    render: () => <SubmittingComposer />,
};

export const SendDisabled: Story = {
    render: () => <SendDisabledComposer />,
};

export const WithAttachments: Story = {
    render: () => <AttachmentsComposer />,
};

export const DisclaimerOff: Story = {
    render: () => <IdleComposer />,
};

export const NoPaperclip: Story = {
    render: () => <NoPaperclipComposer />,
};
