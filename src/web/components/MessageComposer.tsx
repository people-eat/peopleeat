import { PaperclipIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { AttachmentGroup } from './base/attachment';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from './base/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import { MessageComposerAttachment } from './message-composer-attachment';
import { useMessageComposerFileIntake } from './message-composer-file-intake';
import { useMessageComposerLayout } from './message-composer-layout';
import { MessageComposerSendButton } from './message-composer-send-button';
import type { MessageComposerProps } from './message-composer-types';

export type { ComposerAttachment, MessageComposerProps } from './message-composer-types';

function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, isMobile: boolean, submit: () => void) {
    if (!isMobile && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
    }
}

export function MessageComposer({
    value,
    onValueChange,
    onSubmit,
    disabled = false,
    sendDisabled = false,
    busy = false,
    submitting,
    placeholder,
    ariaLabel,
    rows = 1,
    addonStart,
    showAttachButton = true,
    attachments,
    onAttachmentsAdd,
    onAttachmentRemove,
    accept,
    multipleAttachments = true,
    name = 'message',
    autoFocus = false,
    showDisclaimer = true,
}: MessageComposerProps) {
    const locale = useLocale();
    const isMobile = useIsMobile();
    const attachmentsEnabled = onAttachmentsAdd !== undefined;
    const currentAttachments = attachments ?? [];
    const formRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const focusRestorePendingRef = useRef(false);
    const autoFocusPendingRef = useRef(autoFocus);
    const sentTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
    const mountedRef = useRef(true);
    const [showSent, setShowSent] = useState(false);
    const sending = submitting ?? busy;
    const attachLabel = { de: 'Datei anhängen', en: 'Attach file' }[locale];
    const basePlaceholder = placeholder ?? { de: 'Nachricht eingeben…', en: 'Type a message…' }[locale];
    const resolvedPlaceholder = isMobile
        ? basePlaceholder
        : `${basePlaceholder} (${{ de: 'Shift+Enter für neue Zeile', en: 'Shift+Enter for new line' }[locale]})`;
    let sendLabel = { de: 'Senden', en: 'Send' }[locale];
    if (sending) {
        sendLabel = { de: 'Wird gesendet', en: 'Sending' }[locale];
    } else if (showSent) {
        sendLabel = { de: 'Gesendet', en: 'Sent' }[locale];
    }
    const hasAttachments = currentAttachments.length > 0;
    const expanded = useMessageComposerLayout({ value, hasAttachments, textareaRef });

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (sentTimeoutRef.current !== null) {
                globalThis.clearTimeout(sentTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!busy || (!focusRestorePendingRef.current && !autoFocusPendingRef.current)) {
            return;
        }

        const cancelFocusRestore = () => {
            focusRestorePendingRef.current = false;
            autoFocusPendingRef.current = false;
        };
        const cancelFocusRestoreOutsideComposer = (event: Event) => {
            const target = event.target;
            if (event.type === 'focusin' && target === document.body) {
                return;
            }
            if (!(target instanceof Node) || !formRef.current?.contains(target)) {
                cancelFocusRestore();
            }
        };

        document.addEventListener('focusin', cancelFocusRestoreOutsideComposer, true);
        document.addEventListener('keydown', cancelFocusRestoreOutsideComposer, true);
        document.addEventListener('pointerdown', cancelFocusRestoreOutsideComposer, true);
        document.addEventListener('touchstart', cancelFocusRestoreOutsideComposer, true);
        document.addEventListener('wheel', cancelFocusRestoreOutsideComposer, true);
        window.addEventListener('blur', cancelFocusRestore);

        return () => {
            document.removeEventListener('focusin', cancelFocusRestoreOutsideComposer, true);
            document.removeEventListener('keydown', cancelFocusRestoreOutsideComposer, true);
            document.removeEventListener('pointerdown', cancelFocusRestoreOutsideComposer, true);
            document.removeEventListener('touchstart', cancelFocusRestoreOutsideComposer, true);
            document.removeEventListener('wheel', cancelFocusRestoreOutsideComposer, true);
            window.removeEventListener('blur', cancelFocusRestore);
        };
    }, [busy]);

    const wasBusyRef = useRef(busy);
    useEffect(() => {
        if (wasBusyRef.current && !busy) {
            const activeElement = document.activeElement;
            const composerStillOwnsFocus =
                activeElement === document.body || (activeElement instanceof Node && formRef.current?.contains(activeElement));
            if (focusRestorePendingRef.current && !isMobile && composerStillOwnsFocus) {
                textareaRef.current?.focus({ preventScroll: true });
            }
            focusRestorePendingRef.current = false;
        }
        wasBusyRef.current = busy;
    }, [busy, isMobile]);

    useEffect(() => {
        if (!autoFocus || isMobile) {
            autoFocusPendingRef.current = false;
            return;
        }
        if (!busy && autoFocusPendingRef.current) {
            textareaRef.current?.focus({ preventScroll: true });
            autoFocusPendingRef.current = false;
        }
    }, [autoFocus, busy, isMobile]);

    const anyUploading = currentAttachments.some((attachment) => attachment.status === 'uploading');
    const canSubmit = !disabled && !sendDisabled && !busy && !anyUploading && (value.trim().length > 0 || hasAttachments);
    const inputsLocked = disabled || busy;

    const { fileInputRef, isDragOver, formHandlers, onPickerChange, onPaste, openPicker } = useMessageComposerFileIntake({
        enabled: attachmentsEnabled && !inputsLocked,
        multiple: multipleAttachments,
        onAdd: onAttachmentsAdd,
        value,
        onValueChange,
    });

    const submit = () => {
        if (canSubmit) {
            focusRestorePendingRef.current = !isMobile;
            const result = onSubmit();
            void Promise.resolve(result).then((accepted) => {
                if (accepted !== true || !mountedRef.current) {
                    return;
                }
                setShowSent(true);
                if (sentTimeoutRef.current !== null) {
                    globalThis.clearTimeout(sentTimeoutRef.current);
                }
                sentTimeoutRef.current = globalThis.setTimeout(() => {
                    setShowSent(false);
                    sentTimeoutRef.current = null;
                }, 700);
            });
        }
    };

    const attachButton =
        attachmentsEnabled && showAttachButton ? (
            <>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multipleAttachments}
                    className="hidden"
                    onChange={onPickerChange}
                />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <InputGroupButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={inputsLocked}
                            aria-label={attachLabel}
                            onClick={openPicker}
                        >
                            <PaperclipIcon />
                        </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent side="top">{attachLabel}</TooltipContent>
                </Tooltip>
            </>
        ) : null;

    const sendButton = (
        <MessageComposerSendButton submitting={sending} showSent={showSent} expanded={expanded} disabled={!canSubmit} label={sendLabel} />
    );

    return (
        <form
            ref={formRef}
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
            {...formHandlers}
        >
            <InputGroup className={cn(isDragOver && 'border-ring ring-[3px] ring-ring/50')}>
                {hasAttachments ? (
                    <InputGroupAddon align="block-start">
                        <AttachmentGroup>
                            {currentAttachments.map((attachment) => (
                                <MessageComposerAttachment
                                    key={attachment.localId}
                                    attachment={attachment}
                                    disabled={inputsLocked}
                                    onRemove={() => onAttachmentRemove?.(attachment.localId)}
                                />
                            ))}
                        </AttachmentGroup>
                    </InputGroupAddon>
                ) : null}

                {!expanded && (addonStart || attachButton) ? (
                    <InputGroupAddon align="inline-start">
                        {addonStart}
                        {attachButton}
                    </InputGroupAddon>
                ) : null}

                <InputGroupTextarea
                    ref={textareaRef}
                    name={name}
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    onPaste={onPaste}
                    onKeyDown={(event) => handleTextareaKeyDown(event, isMobile, submit)}
                    enterKeyHint={isMobile ? 'enter' : 'send'}
                    placeholder={resolvedPlaceholder}
                    aria-label={ariaLabel}
                    disabled={inputsLocked}
                    rows={rows}
                    className="max-h-37.5 min-h-0 no-scrollbar"
                />

                <InputGroupAddon
                    align={expanded ? 'block-end' : 'inline-end'}
                    className={cn(!expanded && 'has-[>button]:mr-0', expanded && 'pb-1.5')}
                >
                    {expanded ? addonStart : null}
                    {expanded ? attachButton : null}
                    {sendButton}
                </InputGroupAddon>
            </InputGroup>
            {showDisclaimer ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    {
                        { de: 'Antworten durch KI erstellt. Ergebnisse prüfen.', en: 'Responses generated by AI. Please verify results.' }[
                            locale
                        ]
                    }
                </p>
            ) : null}
        </form>
    );
}
