import { webPageUrlGet } from '../seo/webPageUrlGet';
import { DEFAULT_LOCALE } from './locale';
import type { Locale } from './locale';

export function publicChefUrl(cookId: string, locale: Locale): string {
    const origin = webPageUrlGet();
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    return `${origin}${prefix}/chefs/${cookId}`;
}

export type WebShareData = {
    title: string;
    text: string;
    url: string;
};

export type WebShareResult = { method: 'share' | 'copy' | 'cancelled' };

function isShareCancel(error: unknown): boolean {
    return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError');
}

/**
 * Prefer the native share sheet when available; otherwise copy `url` to the clipboard.
 * Caller should toast only for `copy` success/failure — native share provides its own UI.
 */
export async function webShareOrCopy(data: WebShareData): Promise<WebShareResult> {
    const shareData: ShareData = { title: data.title, text: data.text, url: data.url };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const canShare = typeof navigator.canShare !== 'function' || navigator.canShare(shareData);
        if (canShare) {
            try {
                await navigator.share(shareData);
                return { method: 'share' };
            } catch (error) {
                if (isShareCancel(error)) return { method: 'cancelled' };
            }
        }
    }

    await navigator.clipboard.writeText(data.url);
    return { method: 'copy' };
}
