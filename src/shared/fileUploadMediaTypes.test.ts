import { describe, expect, it } from 'vitest';

import {
    fileUploadContentDisposition,
    fileUploadContentDispositionFilename,
    fileUploadMediaTypeAllowed,
    fileUploadResponseContentType,
} from './fileUploadMediaTypes';

describe('fileUploadMediaTypes', () => {
    it('allows chat images, pdf, and audio', () => {
        expect(fileUploadMediaTypeAllowed('image/webp')).toBe(true);
        expect(fileUploadMediaTypeAllowed('application/pdf')).toBe(true);
        expect(fileUploadMediaTypeAllowed('audio/webm;codecs=opus')).toBe(true);
    });

    it('rejects active document types', () => {
        expect(fileUploadMediaTypeAllowed('text/html')).toBe(false);
        expect(fileUploadMediaTypeAllowed('image/svg+xml')).toBe(false);
        expect(fileUploadMediaTypeAllowed('application/xhtml+xml')).toBe(false);
    });

    it('inlines bitmap images and audio, and downloads everything else', () => {
        expect(fileUploadContentDisposition('image/png')).toBe('inline');
        expect(fileUploadContentDisposition('audio/ogg')).toBe('inline');
        expect(fileUploadContentDisposition('application/pdf')).toBe('attachment');
        expect(fileUploadContentDisposition('text/html')).toBe('attachment');
        expect(fileUploadContentDisposition('image/svg+xml')).toBe('attachment');
    });

    it('rewrites active document types to an opaque content type', () => {
        expect(fileUploadResponseContentType('text/html')).toBe('application/octet-stream');
        expect(fileUploadResponseContentType('image/svg+xml')).toBe('application/octet-stream');
        expect(fileUploadResponseContentType('application/pdf')).toBe('application/pdf');
    });

    it('strips header-breaking characters from the download filename', () => {
        expect(fileUploadContentDispositionFilename('menu.pdf\r\nX: 1')).toBe('menu.pdfX: 1');
        expect(fileUploadContentDispositionFilename('   ')).toBe('download');
    });
});
