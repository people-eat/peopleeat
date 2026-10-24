import { describe, expect, it, vi } from 'vitest';
import {
    IMAGE_CROP_ASPECT,
    IMAGE_CROP_PRESETS,
    imageCropCompress,
    imageCropOutputDimensions,
    imageCropZoomBounds,
} from './imageCropCompress';

describe('IMAGE_CROP_ASPECT', () => {
    it('keeps avatar, meal, and content square; logo and contentWide are landscape 16:9', () => {
        expect(IMAGE_CROP_ASPECT.avatar).toBe(1);
        expect(IMAGE_CROP_ASPECT.logo).toBeCloseTo(16 / 9, 5);
        expect(IMAGE_CROP_ASPECT.meal).toBe(1);
        expect(IMAGE_CROP_ASPECT.content).toBe(1);
        expect(IMAGE_CROP_ASPECT.contentWide).toBeCloseTo(16 / 9, 5);
    });
});

describe('imageCropOutputDimensions', () => {
    it('keeps dimensions when both edges are within the max', () => {
        expect(imageCropOutputDimensions(400, 400, 512)).toEqual({ width: 400, height: 400 });
    });

    it('scales a square crop down to the max edge', () => {
        expect(imageCropOutputDimensions(2000, 2000, 512)).toEqual({ width: 512, height: 512 });
    });

    it('scales a non-square crop by the longer edge', () => {
        expect(imageCropOutputDimensions(1000, 500, 500)).toEqual({ width: 500, height: 250 });
    });

    it('never returns a zero edge after rounding', () => {
        expect(imageCropOutputDimensions(1, 2000, 512)).toEqual({ width: 1, height: 512 });
    });
});

describe('imageCropZoomBounds', () => {
    it('sets min zoom so a wide image fits inside a square crop', () => {
        // Contain-rendered landscape media wider than the square crop frame.
        const bounds = imageCropZoomBounds(800, 300, 300, 300);
        expect(bounds.minZoom).toBeCloseTo(300 / 800, 3);
        expect(bounds.fillZoom).toBeCloseTo(1, 3);
        expect(bounds.minZoom).toBeLessThan(1);
        expect(bounds.maxZoom).toBeGreaterThan(bounds.fillZoom);
    });

    it('scales min zoom up when the media is smaller than the crop', () => {
        const bounds = imageCropZoomBounds(200, 200, 300, 300);
        expect(bounds.minZoom).toBeCloseTo(1.5, 3);
        expect(bounds.fillZoom).toBeCloseTo(1.5, 3);
    });

    it('accounts for rotation in the media bounding box', () => {
        const upright = imageCropZoomBounds(400, 200, 200, 400, 0);
        const rotated = imageCropZoomBounds(400, 200, 200, 400, 90);
        expect(upright.minZoom).toBeCloseTo(0.5, 3);
        expect(upright.fillZoom).toBeCloseTo(2, 3);
        expect(rotated.minZoom).toBeCloseTo(1, 3);
        expect(rotated.fillZoom).toBeCloseTo(1, 3);
    });
});

describe('imageCropCompress', () => {
    it('draws the crop into a canvas and returns a File with the preset name', async () => {
        const fillRect = vi.fn();
        const drawImage = vi.fn();
        const toBlob = vi.fn((callback: BlobCallback, mimeType?: string) => {
            callback(new Blob([new Uint8Array([1, 2, 3])], { type: mimeType ?? 'image/jpeg' }));
        });

        vi.stubGlobal(
            'Image',
            class {
                decoding = '';
                addEventListener(type: string, listener: () => void) {
                    if (type === 'load') queueMicrotask(listener);
                }
                set src(_value: string) {
                    // load fires via addEventListener microtask
                }
            },
        );

        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext: () => ({ fillRect, drawImage, fillStyle: '' }),
                    toBlob,
                } as unknown as HTMLCanvasElement;
            }
            return document.createElement(tagName);
        });

        const file = await imageCropCompress('blob:test', { x: 10, y: 20, width: 800, height: 800 }, IMAGE_CROP_PRESETS.avatar);

        expect(drawImage).toHaveBeenCalled();
        expect(fillRect).toHaveBeenCalled();
        expect(file).toBeInstanceOf(File);
        expect(file.name).toBe('avatar.webp');
        expect(file.type).toBe('image/webp');
    });
});
