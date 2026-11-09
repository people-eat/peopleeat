import { inArray } from 'drizzle-orm';

import { COOK_MENU_SUGGESTION_FILE_MAX } from '../../shared/cookMenuSuggestion';
import { fileUploadImageMediaTypeAllowed } from '../../shared/fileUploadMediaTypes';
import { fileUploads } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { docxTextExtract } from './docxTextExtract';

const PDF_MEDIA_TYPE = 'application/pdf';
const PLAIN_TEXT_MEDIA_TYPE = 'text/plain';
const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type CookMenuSuggestionFilePart = {
    type: 'file';
    data: Buffer;
    mediaType: string;
};

export type CookMenuSuggestionFileContents = {
    extractedTextParts: string[];
    fileParts: CookMenuSuggestionFilePart[];
    promptPlaceholders: string[];
};

function mediaTypeNormalize(mediaType: string): string {
    return mediaType.toLowerCase().split(';')[0]?.trim() ?? '';
}

function bytesAsBuffer(bytes: Buffer | Uint8Array): Buffer {
    return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

/** Load cook-owned uploads for menu suggestion: PDF/images as file parts, txt/docx as text. */
export async function cookMenuSuggestionFileContentsLoad(
    cookId: string,
    fileUploadIds: readonly string[],
    serverRuntime: ServerRuntime,
): Promise<CookMenuSuggestionFileContents> {
    const uniqueIds = [...new Set(fileUploadIds.filter((id) => id.trim().length > 0))];
    if (uniqueIds.length > COOK_MENU_SUGGESTION_FILE_MAX) {
        throw new Error(`cookMenuSuggestionFromText: at most ${COOK_MENU_SUGGESTION_FILE_MAX} files`);
    }
    if (uniqueIds.length === 0) {
        return { extractedTextParts: [], fileParts: [], promptPlaceholders: [] };
    }

    const rows = await serverRuntime.db.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, uniqueIds));
    const byId = new Map(rows.map((row) => [row.fileUploadId, row]));

    const extractedTextParts: string[] = [];
    const fileParts: CookMenuSuggestionFilePart[] = [];
    const promptPlaceholders: string[] = [];

    for (const fileUploadId of uniqueIds) {
        const row = byId.get(fileUploadId);
        if (row == null || row.userId !== cookId) {
            throw new Error('cookMenuSuggestionFromText: file upload not found');
        }

        const mediaType = mediaTypeNormalize(row.mediaType);
        const buffer = bytesAsBuffer(row.bytes);
        promptPlaceholders.push(`[file mediaType=${mediaType} byteLength=${buffer.byteLength} filename=${row.filename}]`);

        if (fileUploadImageMediaTypeAllowed(mediaType) || mediaType === PDF_MEDIA_TYPE) {
            fileParts.push({ type: 'file', data: buffer, mediaType });
            continue;
        }

        if (mediaType === PLAIN_TEXT_MEDIA_TYPE) {
            const text = new TextDecoder('utf-8').decode(buffer).trim();
            if (text.length > 0) extractedTextParts.push(text);
            continue;
        }

        if (mediaType === DOCX_MEDIA_TYPE) {
            const text = await docxTextExtract(buffer);
            if (text.length > 0) extractedTextParts.push(text);
            continue;
        }

        throw new Error('cookMenuSuggestionFromText: file type is not allowed');
    }

    return { extractedTextParts, fileParts, promptPlaceholders };
}
