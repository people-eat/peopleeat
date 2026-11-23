import type { ComponentProps } from 'react';

export type AppImageProps = Omit<ComponentProps<'img'>, 'alt'> & {
    /**
     * Above-the-fold / LCP media: eager load + high fetch priority.
     * Default is lazy + async decode (below-the-fold cards, grids, chrome).
     */
    priority?: boolean;
    /** Required. Use `""` for decorative images. See `docs/architecture/image-delivery.md`. */
    alt: string;
};

/**
 * Shared `<img>` defaults for marketing and user media. Not a transform
 * pipeline — see `docs/architecture/image-delivery.md`.
 */
export function AppImage({ priority = false, loading, decoding = 'async', fetchPriority, alt, ...props }: AppImageProps) {
    return (
        <img
            alt={alt}
            decoding={decoding}
            loading={loading ?? (priority ? 'eager' : 'lazy')}
            fetchPriority={fetchPriority ?? (priority ? 'high' : undefined)}
            {...props}
        />
    );
}
