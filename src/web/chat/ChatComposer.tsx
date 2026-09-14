import { EllipsisVerticalIcon, PaperclipIcon } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { useMutation } from 'urql';
import { idCreate } from '../../shared/idCreate';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../components/base/dropdown-menu';
import { InputGroupButton } from '../components/base/input-group';
import { MessageComposer } from '../components/MessageComposer';
import type { ComposerAttachment } from '../components/MessageComposer';
import { ChatMessageCreateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { uploadErrorMessage, uploadFile } from './fileUpload';

type ToolCallApprovalMode = 'auto' | 'manual';

export type ChatComposerHandle = {
    /** Fill and send an explicit message (suggestion chips). */
    submitText: (text: string) => Promise<boolean>;
};

interface ChatComposerProps {
    chatId?: string;
    surface: 'admin' | 'customer' | 'cook';
    onMessageSent?: (chatId: string) => void;
    isLocked?: boolean;
    /** Controlled draft — lift to preserve across compose ↔ list. */
    value?: string;
    onValueChange?: (value: string) => void;
    autoFocus?: boolean;
}

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(function ChatComposerInner(
    { chatId, surface, onMessageSent, isLocked = false, value, onValueChange, autoFocus = false },
    ref,
) {
    const locale = useLocale();
    const [internalDraft, setInternalDraft] = useState('');
    const draft = value ?? internalDraft;
    const setDraft = onValueChange ?? setInternalDraft;
    const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
    const [mode, setMode] = useState<ToolCallApprovalMode>('auto');
    const [submitting, setSubmitting] = useState(false);
    const [, sendMessage] = useMutation(ChatMessageCreateDocument);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const draftRef = useRef(draft);
    draftRef.current = draft;
    const attachmentsRef = useRef(attachments);
    attachmentsRef.current = attachments;
    const modeRef = useRef(mode);
    modeRef.current = mode;

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
                        const message = uploadErrorMessage(error, locale);
                        updateAttachment(attachment.localId, { status: 'error', error: message });
                    }
                })();
            }
        },
        [updateAttachment, locale],
    );

    const onAttachmentRemove = useCallback((localId: string) => {
        setAttachments((current) => current.filter((attachment) => attachment.localId !== localId));
    }, []);

    const onFileInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            event.target.value = '';
            if (files.length > 0) onAttachmentsAdd(files);
        },
        [onAttachmentsAdd],
    );

    const send = useCallback(
        async (messageText: string): Promise<boolean> => {
            const message = messageText.trim();
            const currentAttachments = attachmentsRef.current;
            const hasUploaded = currentAttachments.some((a) => a.status === 'uploaded');
            if (!message && !hasUploaded) return false;
            if (isLocked) return false;

            setSubmitting(true);
            const sentAttachments = currentAttachments;
            const fileUploadIds = currentAttachments
                .filter((attachment) => attachment.status === 'uploaded' && attachment.fileUploadId)
                .map((attachment) => attachment.fileUploadId!);
            setDraft('');
            setAttachments([]);

            const result = await sendMessage({
                chatId,
                message,
                fileUploadIds,
                surface,
                clientRequestId: idCreate(),
                requireToolCallApprovals: modeRef.current === 'manual',
            });
            setSubmitting(false);

            if (result.error || !result.data?.user.chatMessageCreate) {
                setDraft(message);
                setAttachments(sentAttachments);
                return false;
            }
            onMessageSent?.(result.data.user.chatMessageCreate.chatId);
            return true;
        },
        [chatId, isLocked, onMessageSent, sendMessage, setDraft, surface],
    );

    const submit = useCallback(async (): Promise<boolean> => send(draftRef.current), [send]);

    useImperativeHandle(
        ref,
        () => ({
            submitText: (text: string) => send(text),
        }),
        [send],
    );

    const menuLabel = { de: 'Composer-Optionen', en: 'Composer options' }[locale];
    const attachLabel = { de: 'Datei anhängen', en: 'Attach file' }[locale];
    const approvalLabel = { de: 'Tool-Freigabe', en: 'Tool approval' }[locale];
    const inputsLocked = isLocked || submitting;

    return (
        <MessageComposer
            value={draft}
            onValueChange={setDraft}
            onSubmit={submit}
            disabled={isLocked}
            busy={isLocked}
            submitting={submitting}
            autoFocus={autoFocus}
            placeholder={{ de: 'Nachricht eingeben…', en: 'Type a message…' }[locale]}
            ariaLabel={{ de: 'Nachricht', en: 'Message' }[locale]}
            attachments={attachments}
            onAttachmentsAdd={onAttachmentsAdd}
            onAttachmentRemove={onAttachmentRemove}
            showAttachButton={false}
            addonStart={
                <>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        disabled={inputsLocked}
                        onChange={onFileInputChange}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <InputGroupButton type="button" variant="ghost" size="icon-sm" disabled={inputsLocked} aria-label={menuLabel}>
                                <EllipsisVerticalIcon />
                            </InputGroupButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-48">
                            <DropdownMenuItem
                                disabled={inputsLocked}
                                onSelect={() => {
                                    fileInputRef.current?.click();
                                }}
                            >
                                <PaperclipIcon />
                                {attachLabel}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>{approvalLabel}</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={mode} onValueChange={(next) => setMode(next as ToolCallApprovalMode)}>
                                    <DropdownMenuRadioItem value="auto">
                                        {{ de: 'Automatisch', en: 'Automatic' }[locale]}
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="manual">
                                        {{ de: 'Manuell freigeben', en: 'Ask before tools' }[locale]}
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            }
        />
    );
});
