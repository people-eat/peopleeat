// Single-file upload to `POST /api/file-uploads`. Returns the persisted
// file-upload metadata so callers (e.g. the chat composer) can transition the
// per-tile UI from `uploading` to `uploaded` and stash the `fileUploadId`
// for the eventual mutation that references it.
//
// The endpoint is same-origin and authorized by the session cookie (the
// browser sends it automatically), so we don't need to thread credentials
// through here. We do throw a typed `FileUploadError` on any non-2xx
// response so callers can map it onto the per-tile error state.

import type { Locale } from '../utils/locale';

export interface UploadedFile {
    fileUploadId: string;
    filename: string;
    mediaType: string;
    size: number;
}

// Map English API / fetch error bodies onto bilingual UI copy so tiles and
// forms never show raw server English to a DE visitor (or vice versa).
export function uploadErrorMessage(error: unknown, locale: Locale): string {
    if (!(error instanceof Error)) {
        return { de: 'Upload fehlgeschlagen', en: 'Upload failed' }[locale];
    }
    // `uploadFile` emits `Upload failed (NNN)` when the server body isn't a
    // structured `{ error }` — localize that technical fallback. Known English
    // API error bodies from `/api/file-uploads` are mapped here too.
    const match = /^Upload failed \((\d+)\)$/.exec(error.message);
    if (match) {
        return { de: `Upload fehlgeschlagen (${match[1]})`, en: `Upload failed (${match[1]})` }[locale];
    }
    const known: Record<string, { de: string; en: string }> = {
        'Unauthorized: anonymous session has no user': {
            de: 'Nicht autorisiert: anonyme Sitzung ohne Benutzer',
            en: 'Unauthorized: anonymous session has no user',
        },
        'Could not parse multipart form data': {
            de: 'Formular-Daten konnten nicht gelesen werden',
            en: 'Could not parse multipart form data',
        },
        'No file in form data': {
            de: 'Keine Datei in den Formulardaten',
            en: 'No file in form data',
        },
        'Failed to persist file upload': {
            de: 'Datei-Upload konnte nicht gespeichert werden',
            en: 'Failed to persist file upload',
        },
    };
    const mapped = known[error.message];
    if (mapped) return mapped[locale];
    const tooLarge = /^File too large: (\d+) bytes exceeds (\d+)-byte limit$/.exec(error.message);
    if (tooLarge) {
        return {
            de: `Datei zu groß: ${tooLarge[1]} Bytes überschreiten das Limit von ${tooLarge[2]} Bytes`,
            en: `File too large: ${tooLarge[1]} bytes exceeds ${tooLarge[2]}-byte limit`,
        }[locale];
    }
    return { de: 'Upload fehlgeschlagen', en: 'Upload failed' }[locale];
}

// Internal — callers only see it via the thrown `Error` shape. We could
// surface `FileUploadError.status` later if a UI wants to branch on it
// (e.g. show a retry button on 5xx vs a "too large" message on 413), at which
// point this becomes `export`.
class FileUploadError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'FileUploadError';
    }
}

export async function uploadFile(file: File, signal?: AbortSignal): Promise<UploadedFile> {
    const formData = new FormData();
    // Field name doesn't matter — the route reads the first File entry.
    formData.append('file', file, file.name);

    const response = await fetch('/api/file-uploads', {
        method: 'POST',
        body: formData,
        signal,
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        // English technical fallback — callers with a locale (e.g. ChatComposer)
        // should replace this when the server didn't return a structured error.
        let message = `Upload failed (${response.status})`;
        try {
            const parsed = JSON.parse(text) as { error?: string };
            if (parsed.error) message = parsed.error;
        } catch {
            // Non-JSON error body — fall back to the generic status message.
        }
        throw new FileUploadError(message, response.status);
    }

    return (await response.json()) as UploadedFile;
}
