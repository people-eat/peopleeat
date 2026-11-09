import mammoth from 'mammoth';

/** Extract plain text from a Word (.docx) buffer. */
export async function docxTextExtract(bytes: Buffer | Uint8Array): Promise<string> {
    const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
}
