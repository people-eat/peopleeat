import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { useLocale } from '../hooks/useLocale';
import { IMAGE_CROP_ACCEPT } from '../utils/imageCropCompress';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './base/alert-dialog';
import { Button } from './base/button';

const ImageCropDialog = lazy(async () => {
    const mod = await import('./ImageCropDialog');
    return { default: mod.ImageCropDialog };
});

export type CookMealImageValue = {
    imageFileUploadId: string | null;
    imageUrl: string | null;
};

export function CookMealImageField({
    value,
    onChange,
    disabled = false,
    onBusyChange,
    compact = false,
}: {
    value: CookMealImageValue;
    onChange: (next: CookMealImageValue) => void;
    disabled?: boolean;
    onBusyChange?: (busy: boolean) => void;
    compact?: boolean;
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
            onChange({
                imageFileUploadId: uploaded.fileUploadId,
                imageUrl: `/api/file-uploads/${uploaded.fileUploadId}`,
            });
        } catch (uploadError) {
            setError(uploadErrorMessage(uploadError, locale));
            throw uploadError instanceof Error ? uploadError : new Error('Meal image upload failed');
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

    function onRemove() {
        onChange({ imageFileUploadId: null, imageUrl: null });
    }

    const actionBusy = disabled || busy;

    return (
        <>
            <div className="grid gap-2">
                <p className="text-sm font-medium">{{ de: 'Bild', en: 'Image' }[locale]}</p>
                {value.imageUrl ? (
                    <img
                        src={value.imageUrl}
                        alt=""
                        className={
                            compact
                                ? 'aspect-square h-auto w-full max-w-40 object-cover'
                                : 'aspect-square h-auto w-full max-w-sm object-cover'
                        }
                    />
                ) : (
                    <div className="grid gap-1">
                        <p className="text-sm text-muted-foreground">{{ de: 'Noch kein Bild.', en: 'No image yet.' }[locale]}</p>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Ohne Bild erscheint das Gericht nicht auf deiner öffentlichen Kochseite.',
                                    en: 'Without a picture, the meal does not appear on your public cook page.',
                                }[locale]
                            }
                        </p>
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept={IMAGE_CROP_ACCEPT}
                    className="sr-only"
                    onChange={(event) => onSelected(event.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={actionBusy} onClick={() => inputRef.current?.click()}>
                        {
                            {
                                de: busy ? 'Lädt…' : 'Bild auswählen',
                                en: busy ? 'Uploading…' : 'Select image',
                            }[locale]
                        }
                    </Button>
                    {value.imageFileUploadId != null ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="ghost" disabled={actionBusy}>
                                    {{ de: 'Bild entfernen', en: 'Remove image' }[locale]}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{{ de: 'Bild entfernen?', en: 'Remove this image?' }[locale]}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {
                                            {
                                                de: 'Das Bild wird vom Gericht entfernt. Speichere danach, um die Änderung zu übernehmen. Ohne Bild erscheint das Gericht nicht auf deiner öffentlichen Kochseite.',
                                                en: 'The image will be removed from this meal. Save afterwards to apply the change. Without a picture, the meal does not appear on your public cook page.',
                                            }[locale]
                                        }
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" onClick={onRemove}>
                                        {{ de: 'Entfernen', en: 'Remove' }[locale]}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : null}
                </div>
                {error != null ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>

            {cropSrc != null ? (
                <Suspense fallback={null}>
                    <ImageCropDialog open onOpenChange={onCropOpenChange} imageSrc={cropSrc} variant="meal" onConfirm={onCropConfirm} />
                </Suspense>
            ) : null}
        </>
    );
}
