import { RotateCwIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, MediaSize, Size } from 'react-easy-crop';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { IMAGE_CROP_ASPECT, IMAGE_CROP_PRESETS, imageCropCompress, imageCropZoomBounds } from '../utils/imageCropCompress';
import type { ImageCropVariant } from '../utils/imageCropCompress';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Slider } from './base/slider';
import { Spinner } from './base/spinner';

const ZOOM_STEP = 0.05;
const ROTATION_STEP = 90;

export interface ImageCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageSrc: string | null;
    variant: ImageCropVariant;
    /** Called with the cropped + compressed file. Reject to keep the dialog open. */
    onConfirm: (file: File) => void | Promise<void>;
}

export function ImageCropDialog({ open, onOpenChange, imageSrc, variant, onConfirm }: ImageCropDialogProps) {
    const locale = useLocale();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
    const [maxZoom, setMaxZoom] = useState(5);
    const [fillZoom, setFillZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
    const [cropSize, setCropSize] = useState<Size | null>(null);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const zoomInitializedRef = useRef(false);

    useEffect(() => {
        if (!open) return;
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setMinZoom(1);
        setMaxZoom(5);
        setFillZoom(1);
        setRotation(0);
        setMediaSize(null);
        setCropSize(null);
        setCroppedAreaPixels(null);
        setBusy(false);
        setError(null);
        zoomInitializedRef.current = false;
    }, [open, imageSrc]);

    useEffect(() => {
        if (mediaSize == null || cropSize == null) return;
        const bounds = imageCropZoomBounds(mediaSize.width, mediaSize.height, cropSize.width, cropSize.height, rotation);
        setMinZoom(bounds.minZoom);
        setMaxZoom(bounds.maxZoom);
        setFillZoom(bounds.fillZoom);
        if (!zoomInitializedRef.current) {
            zoomInitializedRef.current = true;
            setZoom(bounds.minZoom);
            setCrop({ x: 0, y: 0 });
            return;
        }
        setZoom((current) => Math.min(bounds.maxZoom, Math.max(bounds.minZoom, current)));
    }, [cropSize, mediaSize, rotation]);

    const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels);
    }, []);

    async function handleConfirm() {
        if (imageSrc == null || croppedAreaPixels == null || busy) return;
        setBusy(true);
        setError(null);
        try {
            const file = await imageCropCompress(imageSrc, croppedAreaPixels, IMAGE_CROP_PRESETS[variant], rotation);
            await onConfirm(file);
            onOpenChange(false);
        } catch {
            setError(
                {
                    de: 'Bild konnte nicht gespeichert werden. Bitte erneut versuchen.',
                    en: 'Could not save the image. Please try again.',
                }[locale],
            );
        } finally {
            setBusy(false);
        }
    }

    const title = {
        avatar: { de: 'Profilbild zuschneiden', en: 'Crop profile picture' },
        logo: { de: 'Zusätzliches Bild zuschneiden', en: 'Crop additional picture' },
        meal: { de: 'Foto zuschneiden', en: 'Crop meal image' },
        content: { de: 'Bild zuschneiden', en: 'Crop image' },
        contentWide: { de: 'Bild zuschneiden', en: 'Crop image' },
    }[variant][locale];

    const description = {
        avatar: {
            de: 'Verschiebe und zoome das Bild, bis der Ausschnitt passt.',
            en: 'Drag and zoom until the crop looks right.',
        },
        logo: {
            de: 'Verschiebe und zoome das Bild in den Querformat-Ausschnitt.',
            en: 'Drag and zoom the picture into the landscape frame.',
        },
        meal: {
            de: 'Verschiebe und zoome das Bild in den quadratischen Ausschnitt.',
            en: 'Drag and zoom the image into the square frame.',
        },
        content: {
            de: 'Verschiebe und zoome das Bild in den quadratischen Ausschnitt.',
            en: 'Drag and zoom the image into the square frame.',
        },
        contentWide: {
            de: 'Verschiebe und zoome das Bild in den Querformat-Ausschnitt.',
            en: 'Drag and zoom the picture into the landscape frame.',
        },
    }[variant][locale];

    const zoomLabel = { de: 'Zoom', en: 'Zoom' }[locale];
    const rotateLabel = { de: 'Drehen', en: 'Rotate' }[locale];
    const aspect = IMAGE_CROP_ASPECT[variant];
    const isRound = variant === 'avatar';
    const isRect = !isRound;
    // Below fill, the frame letterboxes — allow empty margins; above fill, keep the media covering the crop.
    const restrictPosition = zoom >= fillZoom - 0.001;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!busy) onOpenChange(next);
            }}
        >
            <DialogContent
                showCloseButton={!busy}
                className={cn(
                    'gap-4 sm:gap-5',
                    // Near-fullscreen crop sheet on phones; centered card on sm+.
                    'max-sm:top-0 max-sm:left-0 max-sm:flex max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:translate-none max-sm:flex-col max-sm:rounded-none max-sm:border-0 max-sm:p-4 max-sm:pt-[max(1rem,env(safe-area-inset-top))] max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]',
                    variant === 'meal' || variant === 'content' || variant === 'contentWide' ? 'sm:max-w-lg' : 'sm:max-w-md',
                )}
                onPointerDownOutside={(event) => {
                    if (busy) event.preventDefault();
                }}
                onEscapeKeyDown={(event) => {
                    if (busy) event.preventDefault();
                }}
            >
                <DialogHeader className="max-sm:shrink-0">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div
                    className={cn(
                        'relative w-full overflow-hidden rounded-md border border-border bg-muted',
                        // Tall stage on mobile; fixed height on desktop cards.
                        'max-sm:min-h-0 max-sm:flex-1 max-sm:rounded-lg',
                        'h-72 sm:h-80',
                        'max-sm:h-auto',
                        busy && 'pointer-events-none opacity-80',
                    )}
                >
                    {imageSrc != null && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={aspect}
                            minZoom={minZoom}
                            maxZoom={maxZoom}
                            cropShape={isRound ? 'round' : 'rect'}
                            showGrid={false}
                            // Contain + dynamic minZoom fits the whole image in the
                            // crop frame (not just the stage). Letterbox below fill.
                            objectFit="contain"
                            restrictPosition={restrictPosition}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onRotationChange={setRotation}
                            onCropComplete={onCropComplete}
                            onMediaLoaded={setMediaSize}
                            onCropSizeChange={setCropSize}
                            classes={{
                                containerClassName: 'h-full',
                                cropAreaClassName: cn(
                                    'border-2! border-foreground! shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]',
                                    isRect && 'rounded-md!',
                                ),
                            }}
                        />
                    )}
                </div>

                <div className="grid max-sm:shrink-0 gap-3">
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">{zoomLabel}</span>
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-10 sm:size-8"
                                    disabled={busy || zoom <= minZoom}
                                    aria-label={{ de: 'Verkleinern', en: 'Zoom out' }[locale]}
                                    onClick={() => setZoom((value) => Math.max(minZoom, Number((value - ZOOM_STEP).toFixed(2))))}
                                >
                                    <ZoomOutIcon />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-10 sm:size-8"
                                    disabled={busy || zoom >= maxZoom}
                                    aria-label={{ de: 'Vergrößern', en: 'Zoom in' }[locale]}
                                    onClick={() => setZoom((value) => Math.min(maxZoom, Number((value + ZOOM_STEP).toFixed(2))))}
                                >
                                    <ZoomInIcon />
                                </Button>
                            </div>
                        </div>
                        <Slider
                            min={minZoom}
                            max={maxZoom}
                            step={ZOOM_STEP}
                            value={[Math.min(maxZoom, Math.max(minZoom, zoom))]}
                            disabled={busy}
                            aria-label={zoomLabel}
                            className="py-1"
                            onValueChange={(value) => setZoom(value[0] ?? minZoom)}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{rotateLabel}</span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 gap-2 px-3 sm:h-8"
                            disabled={busy}
                            aria-label={{ de: 'Um 90° drehen', en: 'Rotate 90°' }[locale]}
                            onClick={() => setRotation((value) => (value + ROTATION_STEP) % 360)}
                        >
                            <RotateCwIcon className="size-4" />
                            {{ de: '90°', en: '90°' }[locale]}
                        </Button>
                    </div>
                </div>

                {error != null && <p className="text-sm text-destructive max-sm:shrink-0">{error}</p>}

                <DialogFooter className="gap-2 max-sm:mt-auto max-sm:shrink-0 max-sm:flex-col-reverse sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        className="max-sm:h-11 max-sm:w-full"
                        disabled={busy}
                        onClick={() => onOpenChange(false)}
                    >
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button
                        type="button"
                        className="max-sm:h-11 max-sm:w-full"
                        disabled={busy || croppedAreaPixels == null}
                        onClick={() => void handleConfirm()}
                    >
                        {busy && <Spinner className="size-4" />}
                        {
                            {
                                de: busy ? 'Speichern…' : 'Übernehmen',
                                en: busy ? 'Saving…' : 'Apply',
                            }[locale]
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
