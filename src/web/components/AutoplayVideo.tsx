import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { cn } from '../utils/cn';

/**
 * Decorative looping video that starts automatically when the browser allows it.
 *
 * iOS Safari is strict: React's `muted` prop does not always set the DOM
 * `muted` property before the first `play()` attempt, so autoplay is blocked
 * and Safari paints its native play overlay. We force the property, retry on
 * media-ready + first gesture, and hide that overlay via `.autoplay-video` CSS.
 */
export function AutoplayVideo({
    src,
    className,
    children,
    ...props
}: PropsWithChildren<{ src: string; className?: string } & Omit<ComponentPropsWithoutRef<'video'>, 'src' | 'autoPlay' | 'muted'>>) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const reducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Property (not only the attribute) is what Safari checks for gesture-free play.
        video.defaultMuted = true;
        video.muted = true;
        video.playsInline = true;

        if (reducedMotion) {
            video.pause();
            return;
        }

        const tryPlay = () => {
            video.defaultMuted = true;
            video.muted = true;
            void video.play().catch(() => {
                // Low Power Mode and some autoplay policies still block; first frame stays.
            });
        };

        tryPlay();
        video.addEventListener('loadeddata', tryPlay);
        video.addEventListener('canplay', tryPlay);

        // Low Power Mode often allows play only after a user gesture.
        const onInteract = () => tryPlay();
        document.addEventListener('touchstart', onInteract, { once: true, passive: true });
        document.addEventListener('click', onInteract, { once: true });

        return () => {
            video.removeEventListener('loadeddata', tryPlay);
            video.removeEventListener('canplay', tryPlay);
            document.removeEventListener('touchstart', onInteract);
            document.removeEventListener('click', onInteract);
        };
    }, [src, reducedMotion]);

    return (
        <video
            {...props}
            ref={videoRef}
            autoPlay={!reducedMotion}
            className={cn('autoplay-video', className)}
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            loop
            muted
            playsInline
            preload="auto"
            src={src}
        >
            {children}
        </video>
    );
}
