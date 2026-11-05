// Types a signed-in user may store through POST /api/file-uploads.
// Bitmap images, PDF, and the audio types the chat player understands.
// HTML, SVG, and XML stay off this list: the download route serves bytes
// from the app origin, and those types execute when opened in a tab.

export const FILE_UPLOAD_IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export const FILE_UPLOAD_AUDIO_MEDIA_TYPES = [
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/aac',
    'audio/x-m4a',
] as const;

export const FILE_UPLOAD_MEDIA_TYPES = [...FILE_UPLOAD_IMAGE_MEDIA_TYPES, 'application/pdf', ...FILE_UPLOAD_AUDIO_MEDIA_TYPES] as const;

const ALLOWED = new Set<string>(FILE_UPLOAD_MEDIA_TYPES);
const INLINE = new Set<string>([...FILE_UPLOAD_IMAGE_MEDIA_TYPES, ...FILE_UPLOAD_AUDIO_MEDIA_TYPES]);

// Served as an opaque download even if an older row still has this type.
const ACTIVE_DOCUMENT_MEDIA_TYPES = new Set(['text/html', 'application/xhtml+xml', 'image/svg+xml', 'text/xml', 'application/xml']);

export const FILE_UPLOAD_ACCEPT = FILE_UPLOAD_MEDIA_TYPES.join(',');

export function fileUploadMediaTypeNormalize(mediaType: string): string {
    return mediaType.toLowerCase().split(';')[0]?.trim() ?? '';
}

export function fileUploadMediaTypeAllowed(mediaType: string): boolean {
    return ALLOWED.has(fileUploadMediaTypeNormalize(mediaType));
}

export function fileUploadContentDisposition(mediaType: string): 'inline' | 'attachment' {
    const normalized = fileUploadMediaTypeNormalize(mediaType);
    if (INLINE.has(normalized)) return 'inline';
    return 'attachment';
}

// Active document types are rewritten so a browser cannot render them on this origin.
export function fileUploadResponseContentType(mediaType: string): string {
    const normalized = fileUploadMediaTypeNormalize(mediaType);
    if (!normalized || ACTIVE_DOCUMENT_MEDIA_TYPES.has(normalized)) return 'application/octet-stream';
    return normalized;
}

export function fileUploadContentDispositionFilename(filename: string): string {
    const cleaned = filename.replace(/[\r\n"]/g, '').trim();
    return cleaned.length > 0 ? cleaned : 'download';
}
