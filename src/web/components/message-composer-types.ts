import type { ReactNode } from 'react';

export interface ComposerAttachment {
    localId: string;
    file: File;
    status: 'uploading' | 'uploaded' | 'error';
    fileUploadId?: string;
    error?: string;
}

export type MessageComposerProps = {
    value: string;
    onValueChange: (value: string) => void;
    /** Return `true` when the submit was accepted so the composer can flash
     *  the sent state. Sync `false` / rejected promises skip the flash. */
    onSubmit: () => boolean | void | Promise<boolean | void>;
    disabled?: boolean;
    /** Disables Send without locking the textarea (e.g. content policy). */
    sendDisabled?: boolean;
    busy?: boolean;
    /** Narrower than `busy`: true only while this submit's mutation is in
     *  flight. Lets the sent checkmark show while generation remains busy. */
    submitting?: boolean;
    placeholder?: string;
    ariaLabel: string;
    rows?: number;
    addonStart?: ReactNode;
    /** When false, the default paperclip control is omitted (parent may put
     *  attach in `addonStart`, e.g. a sidebar overflow menu). Default true. */
    showAttachButton?: boolean;
    accept?: string;
    multipleAttachments?: boolean;
    name?: string;
    autoFocus?: boolean;
    showDisclaimer?: boolean;
} & (
    | {
          attachments: readonly ComposerAttachment[];
          onAttachmentsAdd: (files: File[]) => void;
          onAttachmentRemove: (localId: string) => void;
      }
    | {
          attachments?: undefined;
          onAttachmentsAdd?: undefined;
          onAttachmentRemove?: undefined;
      }
);
