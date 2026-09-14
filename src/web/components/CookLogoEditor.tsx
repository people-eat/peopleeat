import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { useLocale } from '../hooks/useLocale';
import { IMAGE_CROP_ACCEPT } from '../utils/imageCropCompress';
import { Button } from './base/button';

const ImageCropDialog = lazy(async () => {
    const mod = await import('./ImageCropDialog');
    return { default: mod.ImageCropDialog };
});

export function CookLogoEditor({
    logoUrl,
    disabled = false,
    onLink,
    onClear,
    onBusyChange,
}: {
    logoUrl: string | null;
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
            toast.success({ de: 'Zusätzliches Bild gespeichert.', en: 'Additional picture saved.' }[locale]);
        } catch (uploadError) {
            setError(uploadErrorMessage(uploadError, locale));
            throw uploadError instanceof Error ? uploadError : new Error('Cook logo upload failed');
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
            toast.success({ de: 'Zusätzliches Bild entfernt.', en: 'Additional picture removed.' }[locale]);
        } catch (clearError) {
            setError(uploadErrorMessage(clearError, locale));
        } finally {
            setBusy(false);
        }
    }

    const actionBusy = disabled || busy;

    return (
        <>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex aspect-video w-full max-w-48 shrink-0 items-center justify-center bg-secondary p-2">
                    {logoUrl != null ? (
                        <img src={logoUrl} alt="" className="size-full object-contain" />
                    ) : (
                        <p className="text-center text-xs text-muted-foreground">
                            {{ de: 'Kein zusätzliches Bild', en: 'No additional picture' }[locale]}
                        </p>
                    )}
                </div>
                <div className="grid min-w-0 flex-1 gap-2">
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Querformat-Bild für den Über-mich-Bereich. Ohne zusätzliches Bild zeigen wir die peopleeat Vorteile.',
                                en: 'Landscape picture for the About section. Without an additional picture we show the peopleeat benefits.',
                            }[locale]
                        }
                    </p>
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
                        {logoUrl != null ? (
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
                    <ImageCropDialog open onOpenChange={onCropOpenChange} imageSrc={cropSrc} variant="logo" onConfirm={onCropConfirm} />
                </Suspense>
            ) : null}
        </>
    );
}
