import type { Area } from 'react-easy-crop';

export type ImageCropVariant = 'avatar' | 'logo' | 'meal' | 'content' | 'contentWide';

export interface ImageCropCompressOptions {
    maxEdgePx: number;
    mimeType: 'image/jpeg' | 'image/webp' | 'image/png';
    quality: number;
    fileName: string;
    /** Soft size ceiling; quality steps down until under this or the quality floor. */
    targetMaxBytes: number;
}

export const IMAGE_CROP_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/** Crop frame aspect ratio (width / height) for each variant. */
export const IMAGE_CROP_ASPECT: Record<ImageCropVariant, number> = {
    avatar: 1,
    // Landscape brand mark on the public chef About column.
    logo: 16 / 9,
    meal: 1,
    // Content block side-by-side image (matches public `aspect-square`).
    content: 1,
    // Standalone image section (matches public `aspect-video`).
    contentWide: 16 / 9,
};

export const IMAGE_CROP_PRESETS: Record<ImageCropVariant, ImageCropCompressOptions> = {
    avatar: {
        maxEdgePx: 512,
        mimeType: 'image/jpeg',
        quality: 0.85,
        fileName: 'avatar.jpg',
        targetMaxBytes: 400_000,
    },
    logo: {
        maxEdgePx: 1280,
        mimeType: 'image/webp',
        quality: 0.85,
        fileName: 'logo.webp',
        targetMaxBytes: 400_000,
    },
    meal: {
        maxEdgePx: 1280,
        mimeType: 'image/jpeg',
        quality: 0.85,
        fileName: 'meal.jpg',
        targetMaxBytes: 600_000,
    },
    content: {
        maxEdgePx: 1280,
        mimeType: 'image/jpeg',
        quality: 0.85,
        fileName: 'content.jpg',
        targetMaxBytes: 600_000,
    },
    contentWide: {
        maxEdgePx: 1600,
        mimeType: 'image/jpeg',
        quality: 0.85,
        fileName: 'content-wide.jpg',
        targetMaxBytes: 700_000,
    },
};

export function imageCropOutputDimensions(cropWidth: number, cropHeight: number, maxEdgePx: number): { width: number; height: number } {
    const edge = Math.max(cropWidth, cropHeight);
    if (edge <= maxEdgePx) {
        return { width: Math.round(cropWidth), height: Math.round(cropHeight) };
    }
    const scale = maxEdgePx / edge;
    return {
        width: Math.max(1, Math.round(cropWidth * scale)),
        height: Math.max(1, Math.round(cropHeight * scale)),
    };
}

const IMAGE_CROP_ZOOM_FLOOR = 0.1;
const IMAGE_CROP_MAX_ZOOM_OVER_FILL = 5;

function rotatedBounds(width: number, height: number, rotationDeg: number): { width: number; height: number } {
    const radians = (rotationDeg * Math.PI) / 180;
    return {
        width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
        height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
    };
}

/**
 * Zoom range for react-easy-crop (`objectFit="contain"`): min fits the whole
 * media inside the crop frame; fill covers the frame; max is fill × factor.
 */
export function imageCropZoomBounds(
    mediaWidth: number,
    mediaHeight: number,
    cropWidth: number,
    cropHeight: number,
    rotationDeg = 0,
): { minZoom: number; maxZoom: number; fillZoom: number } {
    if (mediaWidth <= 0 || mediaHeight <= 0 || cropWidth <= 0 || cropHeight <= 0) {
        return { minZoom: 1, maxZoom: IMAGE_CROP_MAX_ZOOM_OVER_FILL, fillZoom: 1 };
    }

    const media = rotatedBounds(mediaWidth, mediaHeight, rotationDeg);
    const fitZoom = Math.min(cropWidth / media.width, cropHeight / media.height);
    const fillZoom = Math.max(cropWidth / media.width, cropHeight / media.height);
    const minZoom = Math.max(IMAGE_CROP_ZOOM_FLOOR, Number(fitZoom.toFixed(3)));
    const maxZoom = Math.max(minZoom + 0.05, Number((fillZoom * IMAGE_CROP_MAX_ZOOM_OVER_FILL).toFixed(3)));
    return { minZoom, maxZoom, fillZoom: Number(fillZoom.toFixed(3)) };
}

function imageElementLoad(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', () => reject(new Error('Could not load image for crop')));
        image.decoding = 'async';
        image.src = src;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob == null) {
                    reject(new Error(`Could not encode image as ${mimeType}`));
                    return;
                }
                resolve(blob);
            },
            mimeType,
            quality,
        );
    });
}

async function canvasBlobWithQualityLadder(canvas: HTMLCanvasElement, options: ImageCropCompressOptions): Promise<Blob> {
    const qualityFloor = 0.5;
    const qualityStep = 0.1;
    let mimeType: ImageCropCompressOptions['mimeType'] = options.mimeType;
    let quality = options.quality;

    try {
        let blob = await canvasToBlob(canvas, mimeType, quality);
        while (blob.size > options.targetMaxBytes && quality > qualityFloor + 0.001) {
            quality = Math.max(qualityFloor, quality - qualityStep);
            blob = await canvasToBlob(canvas, mimeType, quality);
        }
        return blob;
    } catch (error) {
        if (mimeType !== 'image/webp') throw error;
        mimeType = 'image/jpeg';
        quality = options.quality;
        let blob = await canvasToBlob(canvas, mimeType, quality);
        while (blob.size > options.targetMaxBytes && quality > qualityFloor + 0.001) {
            quality = Math.max(qualityFloor, quality - qualityStep);
            blob = await canvasToBlob(canvas, mimeType, quality);
        }
        return blob;
    }
}

function rotateSize(width: number, height: number, rotationDeg: number): { width: number; height: number } {
    const radians = (rotationDeg * Math.PI) / 180;
    return {
        width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
        height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
    };
}

/**
 * Draw `image` rotated by `rotationDeg` onto a canvas large enough for the
 * bounding box. Used so `crop` from react-easy-crop (pixel area on the rotated
 * media) can be sampled with a simple `drawImage` blit.
 */
function rotatedSourceCanvas(image: HTMLImageElement, rotationDeg: number): HTMLCanvasElement {
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotationDeg);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bBoxWidth));
    canvas.height = Math.max(1, Math.round(bBoxHeight));
    const ctx = canvas.getContext('2d');
    if (ctx == null) {
        throw new Error('Canvas unavailable');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    return canvas;
}

/**
 * Crop `imageSrc` to `crop` (pixel area from react-easy-crop), optionally
 * accounting for `rotationDeg`, downscale to `maxEdgePx`, and encode with a
 * quality ladder toward `targetMaxBytes`.
 */
export async function imageCropCompress(imageSrc: string, crop: Area, options: ImageCropCompressOptions, rotationDeg = 0): Promise<File> {
    const image = await imageElementLoad(imageSrc);
    const { width, height } = imageCropOutputDimensions(crop.width, crop.height, options.maxEdgePx);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx == null) {
        throw new Error('Canvas unavailable');
    }

    // Opaque white underlay so transparent sources (and WebP→JPEG fallback) do
    // not collapse to black on light chrome.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const source: CanvasImageSource = rotationDeg % 360 === 0 ? image : rotatedSourceCanvas(image, rotationDeg);
    ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);

    const blob = await canvasBlobWithQualityLadder(canvas, options);
    const fileName =
        blob.type === 'image/jpeg' && options.fileName.endsWith('.webp') ? options.fileName.replace(/\.webp$/, '.jpg') : options.fileName;
    return new File([blob], fileName, { type: blob.type, lastModified: Date.now() });
}
