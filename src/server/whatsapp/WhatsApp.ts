export type WhatsAppTemplateSendArgs = {
    /** E.164 with leading `+`. */
    toPhoneNumber: string;
    templateName: string;
    languageCode: string;
    bodyParameters: ReadonlyArray<string>;
    /** Dynamic path segment for the first URL button (Meta `button` / `url` component). */
    buttonUrlParameter?: string;
    headerParameters?: ReadonlyArray<string>;
};

export type WhatsAppTextSendArgs = {
    /** E.164 with leading `+`. */
    toPhoneNumber: string;
    body: string;
};

export type WhatsAppSendResult = {
    providerMessageId: string | null;
};

export type WhatsAppMediaDownloadResult = {
    buffer: Buffer;
    mimeType: string;
};

export type WhatsApp = {
    sendTemplate: (args: WhatsAppTemplateSendArgs) => Promise<WhatsAppSendResult>;
    sendText: (args: WhatsAppTextSendArgs) => Promise<WhatsAppSendResult>;
    downloadMedia: (mediaId: string) => Promise<WhatsAppMediaDownloadResult | null>;
    markMessageAsRead: (providerMessageId: string) => Promise<void>;
    /** Verify Meta `X-Hub-Signature-256` against the raw POST body. */
    webhookSignatureVerify: (args: { rawBody: string; signatureHeader: string | null }) => boolean;
};
