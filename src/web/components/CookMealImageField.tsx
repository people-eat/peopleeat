import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
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
    emptyDetail,
    removeDescription,
}: {
    value: CookMealImageValue;
    onChange: (next: CookMealImageValue) => void;
    disabled?: boolean;
    onBusyChange?: (busy: boolean) => void;
    compact?: boolean;
    /** `null` hides the empty-state detail. Omitted keeps the meal public-page hint. */
    emptyDetail?: string | null;
    removeDescription?: string;
}) {
    const locale = useLocale();
    const { t } = useT('profileCook');
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
            setError(t('meal.chooseImageType'));
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
                <p className="text-sm font-medium">{t('actions.image')}</p>
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
                        <p className="text-sm text-muted-foreground">{t('actions.noImage')}</p>
                        {emptyDetail !== null ? (
                            <p className="text-sm text-muted-foreground">{emptyDetail ?? t('meal.noPublicWithoutPicture')}</p>
                        ) : null}
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
                        {busy ? t('meal.uploading') : t('meal.selectImage')}
                    </Button>
                    {value.imageFileUploadId != null ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="ghost" disabled={actionBusy}>
                                    {t('meal.removeImage')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t('meal.removeImageTitle')}</AlertDialogTitle>
                                    <AlertDialogDescription>{removeDescription ?? t('meal.removeImageBody')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" onClick={onRemove}>
                                        {t('actions.remove')}
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
