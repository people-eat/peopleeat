import { useCallback, useState } from 'react';

import { idCreate } from '../../shared/idCreate';
import type { ComposerAttachment } from '../components/MessageComposer';
import { useLocale } from '../hooks/useLocale';
import { uploadErrorMessage, uploadFile } from './fileUpload';

/** Shared attach → upload → settle lifecycle for human chat composers. */
export function useComposerFileAttachments() {
    const locale = useLocale();
    const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);

    const updateAttachment = useCallback((localId: string, patch: Partial<ComposerAttachment>) => {
        setAttachments((current) =>
            current.map((attachment) => (attachment.localId === localId ? { ...attachment, ...patch } : attachment)),
        );
    }, []);

    const onAttachmentsAdd = useCallback(
        (files: File[]) => {
            const additions: ComposerAttachment[] = files.map((file) => ({
                localId: idCreate(),
                file,
                status: 'uploading' as const,
            }));
            setAttachments((current) => [...current, ...additions]);
            for (const attachment of additions) {
                void (async () => {
                    try {
                        const uploaded = await uploadFile(attachment.file);
                        updateAttachment(attachment.localId, {
                            status: 'uploaded',
                            fileUploadId: uploaded.fileUploadId,
                        });
                    } catch (error) {
                        updateAttachment(attachment.localId, {
                            status: 'error',
                            error: uploadErrorMessage(error, locale),
                        });
                    }
                })();
            }
        },
        [updateAttachment, locale],
    );

    const onAttachmentRemove = useCallback((localId: string) => {
        setAttachments((current) => current.filter((attachment) => attachment.localId !== localId));
    }, []);

    const clearAttachments = useCallback(() => {
        setAttachments([]);
    }, []);

    const restoreAttachments = useCallback((next: ComposerAttachment[]) => {
        setAttachments(next);
    }, []);

    const uploadedFileUploadIds = attachments
        .filter((attachment) => attachment.status === 'uploaded' && attachment.fileUploadId)
        .map((attachment) => attachment.fileUploadId!);

    const hasUploaded = uploadedFileUploadIds.length > 0;
    const hasUploading = attachments.some((attachment) => attachment.status === 'uploading');

    return {
        attachments,
        onAttachmentsAdd,
        onAttachmentRemove,
        clearAttachments,
        restoreAttachments,
        uploadedFileUploadIds,
        hasUploaded,
        hasUploading,
    };
}
