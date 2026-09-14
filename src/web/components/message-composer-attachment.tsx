import { FileIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatBytes } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from './base/attachment';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import type { ComposerAttachment } from './message-composer-types';

const ATTACHMENT_STATE = { uploading: 'uploading', uploaded: 'done', error: 'error' } as const;

const IMAGE_EXTENSIONS = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/iu;

function isImageFile(file: File): boolean {
    if (file.type.startsWith('image/')) return true;
    // Some paste / picker paths leave `type` empty — fall back to extension.
    return IMAGE_EXTENSIONS.test(file.name);
}

function attachmentMeta(file: File): string {
    const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toUpperCase() : null;
    const fromType = file.type.includes('/') ? file.type.slice(file.type.indexOf('/') + 1).toUpperCase() : null;
    const kind = (fromType && fromType !== 'OCTET-STREAM' ? fromType : extension) ?? 'FILE';
    return `${kind} · ${formatBytes(file.size)}`;
}

/** Horizontal chip matching shadcn's AttachmentGroup demo — image thumb or file icon + name/meta. */
export function MessageComposerAttachment({
    attachment,
    disabled = false,
    onRemove,
}: Readonly<{
    attachment: ComposerAttachment;
    disabled?: boolean;
    onRemove: () => void;
}>) {
    const locale = useLocale();
    const { file, status, error } = attachment;
    const isImage = isImageFile(file);
    // Create + revoke in the same effect. `useMemo` + Strict Mode remount
    // revokes the memoized URL and leaves a dead blob: reference in the img.
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const removeLabel = { de: `${file.name} entfernen`, en: `Remove ${file.name}` }[locale];
    const failedLabel = { de: 'Upload fehlgeschlagen', en: 'Upload failed' }[locale];

    useEffect(() => {
        if (!isImage) {
            setObjectUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file, isImage]);

    return (
        <Attachment state={ATTACHMENT_STATE[status]} className="w-64">
            {objectUrl ? (
                <AttachmentMedia variant="image">
                    <img src={objectUrl} alt={file.name} />
                </AttachmentMedia>
            ) : (
                <AttachmentMedia>
                    <FileIcon />
                </AttachmentMedia>
            )}
            <AttachmentContent>
                <AttachmentTitle>{file.name}</AttachmentTitle>
                <AttachmentDescription>{status === 'error' ? (error ?? failedLabel) : attachmentMeta(file)}</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <AttachmentAction type="button" disabled={disabled} aria-label={removeLabel} onClick={onRemove}>
                            <XIcon />
                        </AttachmentAction>
                    </TooltipTrigger>
                    <TooltipContent side="top">{removeLabel}</TooltipContent>
                </Tooltip>
            </AttachmentActions>
        </Attachment>
    );
}
