import { PlusIcon, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { uploadErrorMessage, uploadFile } from '../../chat/fileUpload';
import { Button } from '../../components/base/button';
import { Spinner } from '../../components/base/spinner';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';

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

    async function addFile(file: File | undefined) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error({ de: 'Bitte ein Bild auswählen.', en: 'Please choose an image.' }[locale]);
            return;
        }
        setBusy(true);
        try {
            const uploaded = await uploadFile(file);
            const nextIds = [...imageUrls.map(fileUploadIdFromUrl).filter((id): id is string => id != null), uploaded.fileUploadId];
            if (!(await onSave(nextIds))) throw new Error('save failed');
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
            toast.error({ de: 'Entfernen fehlgeschlagen.', en: 'Could not remove the image.' }[locale]);
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
                            aria-label={{ de: 'Bild entfernen', en: 'Remove image' }[locale]}
                            className={cn(
                                'absolute top-1 right-1 rounded-full opacity-0 shadow-sm group-hover:opacity-100',
                                'pointer-fine:opacity-0 focus-visible:opacity-100',
                            )}
                        >
                            <XIcon className="size-3" aria-hidden />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="size-20 border-dashed text-muted-foreground"
                    aria-label={{ de: 'Bild hinzufügen', en: 'Add image' }[locale]}
                >
                    {busy ? <Spinner className="size-4" /> : <PlusIcon className="size-4" aria-hidden />}
                </Button>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void addFile(event.target.files?.[0])}
            />
        </div>
    );
}
