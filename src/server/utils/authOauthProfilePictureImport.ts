import sharp from 'sharp';

export type AuthOauthProfilePictureBytes = {
    bytes: Buffer;
    mediaType: 'image/webp';
    filename: 'avatar.webp';
};

const FETCH_TIMEOUT_MS = 8_000;
const MAX_SOURCE_BYTES = 2_000_000;
/** Match `IMAGE_CROP_PRESETS.avatar` in `src/web/utils/imageCropCompress.ts`. */
const AVATAR_EDGE_PX = 512;
const AVATAR_TARGET_MAX_BYTES = 200_000;
const AVATAR_QUALITY_FLOOR = 50;

export function authOauthPictureHostAllowed(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return (
        host === 'googleusercontent.com' ||
        host.endsWith('.googleusercontent.com') ||
        host === 'ggpht.com' ||
        host.endsWith('.ggpht.com') ||
        host === 'fbcdn.net' ||
        host.endsWith('.fbcdn.net') ||
        host === 'facebook.com' ||
        host.endsWith('.facebook.com') ||
        host === 'fbsbx.com' ||
        host.endsWith('.fbsbx.com')
    );
}

export function authGooglePictureUrlNormalize(url: string | null | undefined): string | null {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/\/a\/default(?:-user)?(?:[/?=#]|$)/i.test(trimmed) || /default-user/i.test(trimmed)) {
        return null;
    }
    if (!authOauthPictureUrlHttpsAllowed(trimmed)) return null;
    if (/=s\d+/.test(trimmed)) {
        return trimmed.replace(/=s\d+(-c)?/, '=s512-c');
    }
    return trimmed;
}

export function authOauthPictureUrlHttpsAllowed(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && authOauthPictureHostAllowed(parsed.hostname);
    } catch {
        return false;
    }
}

export async function authOauthProfilePictureImport(args: {
    url: string;
    fetchImpl?: typeof fetch;
}): Promise<AuthOauthProfilePictureBytes | null> {
    try {
        let parsed: URL;
        try {
            parsed = new URL(args.url);
        } catch {
            return null;
        }
        if (parsed.protocol !== 'https:') return null;
        if (!authOauthPictureHostAllowed(parsed.hostname)) return null;

        const fetchImpl = args.fetchImpl ?? fetch;
        const response = await fetchImpl(parsed.toString(), {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: { accept: 'image/*' },
        });
        if (!response.ok) return null;

        if (response.url) {
            let finalUrl: URL;
            try {
                finalUrl = new URL(response.url);
            } catch {
                return null;
            }
            if (finalUrl.protocol !== 'https:' || !authOauthPictureHostAllowed(finalUrl.hostname)) {
                return null;
            }
        }

        const mediaType = (response.headers.get('content-type') ?? '').toLowerCase().split(';')[0]?.trim() ?? '';
        if (mediaType === 'image/svg+xml') return null;
        if (mediaType && !mediaType.startsWith('image/')) return null;

        const contentLength = Number(response.headers.get('content-length'));
        if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) return null;

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.byteLength === 0 || bytes.byteLength > MAX_SOURCE_BYTES) return null;

        return await authOauthProfilePictureEncode(bytes);
    } catch {
        return null;
    }
}

export async function authOauthProfilePictureEncode(input: Buffer): Promise<AuthOauthProfilePictureBytes | null> {
    try {
        let quality = 85;
        let bytes = await avatarWebpEncode(input, quality);
        while (bytes.byteLength > AVATAR_TARGET_MAX_BYTES && quality > AVATAR_QUALITY_FLOOR) {
            quality -= 10;
            bytes = await avatarWebpEncode(input, quality);
        }
        if (bytes.byteLength === 0) return null;
        return { bytes, mediaType: 'image/webp', filename: 'avatar.webp' };
    } catch {
        return null;
    }
}

function avatarWebpEncode(input: Buffer, quality: number): Promise<Buffer> {
    return sharp(input).rotate().resize(AVATAR_EDGE_PX, AVATAR_EDGE_PX, { fit: 'cover', position: 'centre' }).webp({ quality }).toBuffer();
}
