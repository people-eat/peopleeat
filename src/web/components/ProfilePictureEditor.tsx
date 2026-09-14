import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { useLocale } from '../hooks/useLocale';
import { IMAGE_CROP_ACCEPT } from '../utils/imageCropCompress';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { Button } from './base/button';

const ImageCropDialog = lazy(async () => {
    const mod = await import('./ImageCropDialog');
    return { default: mod.ImageCropDialog };
});

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export function ProfilePictureEditor({
    profilePictureUrl,
    displayName,
    disabled = false,
    onLink,
    onClear,
    onBusyChange,
}: {
    profilePictureUrl: string | null;
    displayName: string;
    disabled?: boolean;
    onLink: (fileUploadId: string) => Promise<void>;
    onClear: () => Promise<void>;
    onBusyChange?: (busy: boolean) => void;
}) {
    const locale = useLocale();
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (cropSrc != null) URL.revokeObjectURL(cropSrc);
        };
    }, [cropSrc]);

    useEffect(() => {
        onBusyChange?.(busy);
    }, [busy, onBusyChange]);

    function onSelected(file: File | undefined) {
        if (file == null) return;
        setError(null);
        if (!file.type.startsWith('image/')) {
            setError(
                {
                    de: 'Bitte ein Bild (JPEG, PNG, WebP oder GIF) wählen.',
                    en: 'Please choose an image (JPEG, PNG, WebP, or GIF).',
                }[locale],
            );
            if (inputRef.current) inputRef.current.value = '';
            return;
        }
        setCropSrc((previous) => {
            if (previous != null) URL.revokeObjectURL(previous);
            return URL.createObjectURL(file);
        });
        if (inputRef.current) inputRef.current.value = '';
    }

    async function onCropConfirm(file: File) {
        setError(null);
        setBusy(true);
        try {
            const uploaded = await uploadFile(file);
            await onLink(uploaded.fileUploadId);
            toast.success({ de: 'Profilbild gespeichert.', en: 'Profile picture saved.' }[locale]);
        } catch (uploadError) {
            setError(uploadErrorMessage(uploadError, locale));
            throw uploadError instanceof Error ? uploadError : new Error('Profile picture upload failed');
        } finally {
            setBusy(false);
        }
    }

    function onCropOpenChange(open: boolean) {
        if (open) return;
        setCropSrc((previous) => {
            if (previous != null) URL.revokeObjectURL(previous);
            return null;
        });
    }

    async function onClearClick() {
        setError(null);
        setBusy(true);
        try {
            await onClear();
            toast.success({ de: 'Profilbild entfernt.', en: 'Profile picture removed.' }[locale]);
        } catch (clearError) {
            setError(uploadErrorMessage(clearError, locale));
        } finally {
            setBusy(false);
        }
    }

    const actionBusy = disabled || busy;

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <Avatar className="size-24 shrink-0 self-center text-2xl sm:self-start">
                    {profilePictureUrl != null ? <AvatarImage src={profilePictureUrl} alt="" /> : null}
                    <AvatarFallback className="text-2xl">{initialsFromName(displayName)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-3">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={IMAGE_CROP_ACCEPT}
                        className="sr-only"
                        onChange={(event) => onSelected(event.target.files?.[0])}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={() => inputRef.current?.click()}>
                            {
                                {
                                    de: busy ? 'Speichert…' : 'Bild auswählen',
                                    en: busy ? 'Saving…' : 'Select picture',
                                }[locale]
                            }
                        </Button>
                        {profilePictureUrl != null ? (
                            <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={() => void onClearClick()}>
                                {{ de: 'Bild entfernen', en: 'Remove picture' }[locale]}
                            </Button>
                        ) : null}
                    </div>
                    {error != null ? <p className="text-sm text-destructive">{error}</p> : null}
                </div>
            </div>

            {cropSrc != null ? (
                <Suspense fallback={null}>
                    <ImageCropDialog open onOpenChange={onCropOpenChange} imageSrc={cropSrc} variant="avatar" onConfirm={onCropConfirm} />
                </Suspense>
            ) : null}
        </>
    );
}
