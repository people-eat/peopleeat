import { PlusIcon, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { t } from '../../../i18n/t';
import { uploadErrorMessage, uploadFile } from '../../chat/fileUpload';
import { Button } from '../../components/base/button';
import { Spinner } from '../../components/base/spinner';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { IMAGE_COMPRESS_PRESETS, IMAGE_CROP_ACCEPT, imageCompress } from '../../utils/imageCropCompress';

/** Matches customer/cook review compose (`BookingRequestOfferTestimonialPanel`). */
const MAX_IMAGES = 8;

/** `imageUrls` are always `/api/file-uploads/{id}` (see `fileUploadPublicUrl`). */
function fileUploadIdFromUrl(url: string): string | null {
    const match = /\/api\/file-uploads\/([^/?#]+)/.exec(url);
    return match?.[1] ?? null;
}

/**
 * Add/remove testimonial photos. Each change immediately calls
 * `*TestimonialImageUpdate` with the full resulting id list — there is no
 * separate Save step, matching the mutation's full-replace contract.
 */
export function AdminTestimonialImageManager({
    imageUrls,
    onSave,
}: {
    imageUrls: string[];
    onSave: (fileUploadIds: string[]) => Promise<boolean>;
}) {
    const locale = useLocale();
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const existingIds = imageUrls.map(fileUploadIdFromUrl).filter((id): id is string => id != null);
    const canAdd = existingIds.length < MAX_IMAGES;

    async function addFiles(fileList: FileList | null) {
        if (fileList == null || fileList.length === 0) return;

        const images = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
        if (images.length === 0) {
            toast.error(t(locale, 'admin', 'copy.pleaseChooseAnImage'));
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const remaining = MAX_IMAGES - existingIds.length;
        if (remaining <= 0) {
            toast.error(t(locale, 'admin', 'copy.maxPhotosPerReview', { count: MAX_IMAGES }));
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const capped = images.length > remaining;
        const toUpload = images.slice(0, remaining);
        setBusy(true);
        const nextIds = [...existingIds];
        try {
            for (const file of toUpload) {
                try {
                    const compressed = await imageCompress(file, IMAGE_COMPRESS_PRESETS.testimonial);
                    const uploaded = await uploadFile(compressed);
                    nextIds.push(uploaded.fileUploadId);
                } catch (error) {
                    if (nextIds.length > existingIds.length) {
                        await onSave(nextIds);
                    }
                    toast.error(uploadErrorMessage(error, locale));
                    return;
                }
            }
            if (nextIds.length > existingIds.length) {
                if (!(await onSave(nextIds))) throw new Error('save failed');
            }
            if (capped) {
                toast.error(t(locale, 'admin', 'copy.maxPhotosPerReview', { count: MAX_IMAGES }));
            }
        } catch (error) {
            toast.error(uploadErrorMessage(error, locale));
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    async function removeImage(url: string) {
        setBusy(true);
        try {
            const nextIds = imageUrls
                .filter((existing) => existing !== url)
                .map(fileUploadIdFromUrl)
                .filter((id): id is string => id != null);
            if (!(await onSave(nextIds))) throw new Error('save failed');
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotRemoveTheImage'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap gap-3">
                {imageUrls.map((url) => (
                    <div key={url} className="group relative size-20 overflow-hidden rounded-md border border-border">
                        <img src={url} alt="" className="size-full object-cover" />
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon-xs"
                            disabled={busy}
                            onClick={() => void removeImage(url)}
                            aria-label={t(locale, 'admin', 'copy.removeImage')}
                            className={cn(
                                'absolute top-1 right-1 rounded-full opacity-0 shadow-sm group-hover:opacity-100',
                                'pointer-fine:opacity-0 focus-visible:opacity-100',
                            )}
                        >
                            <XIcon className="size-3" aria-hidden />
                        </Button>
                    </div>
                ))}
                {canAdd ? (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => inputRef.current?.click()}
                        className="size-20 border-dashed text-muted-foreground"
                        aria-label={t(locale, 'admin', 'copy.addPhotos')}
                    >
                        {busy ? <Spinner className="size-4" /> : <PlusIcon className="size-4" aria-hidden />}
                    </Button>
                ) : null}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept={IMAGE_CROP_ACCEPT}
                multiple
                className="sr-only"
                onChange={(event) => void addFiles(event.target.files)}
            />
        </div>
    );
}
