import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
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
            await onLink(uploaded.fileUploadId);
            toast.success(t('logo.saved'));
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
            toast.success(t('logo.removed'));
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
                        <p className="text-center text-xs text-muted-foreground">{t('logo.empty')}</p>
                    )}
                </div>
                <div className="grid min-w-0 flex-1 gap-2">
                    <p className="text-sm text-muted-foreground">{t('logo.hint')}</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={IMAGE_CROP_ACCEPT}
                        className="sr-only"
                        onChange={(event) => onSelected(event.target.files?.[0])}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={() => inputRef.current?.click()}>
                            {busy ? t('logo.saving') : t('logo.select')}
                        </Button>
                        {logoUrl != null ? (
                            <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={() => void onClearClick()}>
                                {t('logo.remove')}
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
