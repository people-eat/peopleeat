import { createHmac, timingSafeEqual } from 'node:crypto';

import { whatsappPhoneNumberForMetaApi } from '../domain/whatsapp';
import type { Logger } from '../utils/loggerCreate';
import type { WhatsApp, WhatsAppMediaDownloadResult, WhatsAppSendResult, WhatsAppTemplateSendArgs, WhatsAppTextSendArgs } from './WhatsApp';

export type WhatsAppCreateOptions = {
    transport: 'meta' | 'console';
    accessToken: string | undefined;
    phoneNumberId: string | undefined;
    appSecret: string | undefined;
    log: Logger;
};

const GRAPH_API_VERSION = 'v22.0';

export function whatsappCreate(options: WhatsAppCreateOptions): WhatsApp {
    function credentialsRequire(): { accessToken: string; phoneNumberId: string } {
        const accessToken = options.accessToken?.trim();
        const phoneNumberId = options.phoneNumberId?.trim();
        if (!accessToken || !phoneNumberId) {
            throw new Error('whatsappCreate: Meta credentials missing for meta transport');
        }
        return { accessToken, phoneNumberId };
    }

    async function metaMessagesPost(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
        const { accessToken, phoneNumberId } = credentialsRequire();
        const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const json = (await response.json()) as {
            messages?: Array<{ id?: string }>;
            error?: { message?: string };
        };
        if (!response.ok) {
            throw new Error(json.error?.message ?? `WhatsApp send failed with status ${response.status}`);
        }
        return { providerMessageId: json.messages?.[0]?.id ?? null };
    }

    return {
        async sendTemplate(args: WhatsAppTemplateSendArgs): Promise<WhatsAppSendResult> {
            if (options.transport === 'console') {
                console.info(
                    `[whatsapp:console] template=${args.templateName} lang=${args.languageCode} to=${args.toPhoneNumber}` +
                        (args.buttonUrlParameter ? ` button=${args.buttonUrlParameter}` : '') +
                        `\n${args.bodyParameters.join(' | ')}`,
                );
                return { providerMessageId: `console-tpl-${Date.now()}` };
            }

            const components: Array<Record<string, unknown>> = [];
            if (args.headerParameters && args.headerParameters.length > 0) {
                components.push({
                    type: 'header',
                    parameters: args.headerParameters.map((text) => ({ type: 'text', text })),
                });
            }
            if (args.bodyParameters.length > 0) {
                components.push({
                    type: 'body',
                    parameters: args.bodyParameters.map((text) => ({ type: 'text', text })),
                });
            }
            if (args.buttonUrlParameter) {
                components.push({
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: args.buttonUrlParameter }],
                });
            }

            return metaMessagesPost({
                messaging_product: 'whatsapp',
                to: whatsappPhoneNumberForMetaApi(args.toPhoneNumber),
                type: 'template',
                template: {
                    name: args.templateName,
                    language: { code: args.languageCode },
                    ...(components.length > 0 ? { components } : {}),
                },
            });
        },

        async sendText(args: WhatsAppTextSendArgs): Promise<WhatsAppSendResult> {
            if (options.transport === 'console') {
                console.info(`[whatsapp:console] text to=${args.toPhoneNumber}\n${args.body}`);
                return { providerMessageId: `console-txt-${Date.now()}` };
            }

            return metaMessagesPost({
                messaging_product: 'whatsapp',
                to: whatsappPhoneNumberForMetaApi(args.toPhoneNumber),
                type: 'text',
                text: { body: args.body },
            });
        },

        async downloadMedia(mediaId: string): Promise<WhatsAppMediaDownloadResult | null> {
            if (options.transport === 'console') {
                options.log.debug(`whatsapp.downloadMedia skipped (console): ${mediaId}`);
                return null;
            }

            const { accessToken } = credentialsRequire();
            try {
                const metadataResponse = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!metadataResponse.ok) {
                    options.log.info(`whatsapp.downloadMedia: metadata failed status=${metadataResponse.status} id=${mediaId}`);
                    return null;
                }
                const metadata = (await metadataResponse.json()) as { url?: string; mime_type?: string };
                if (!metadata.url || !metadata.mime_type) {
                    options.log.info(`whatsapp.downloadMedia: metadata missing url/mime_type id=${mediaId}`);
                    return null;
                }

                const mediaResponse = await fetch(metadata.url, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!mediaResponse.ok) {
                    options.log.info(`whatsapp.downloadMedia: download failed status=${mediaResponse.status} id=${mediaId}`);
                    return null;
                }
                const buffer = Buffer.from(await mediaResponse.arrayBuffer());
                return { buffer, mimeType: metadata.mime_type };
            } catch (error) {
                options.log.error(
                    error instanceof Error ? new Error(`whatsapp.downloadMedia failed: ${error.message}`, { cause: error }) : error,
                    null,
                );
                return null;
            }
        },

        async markMessageAsRead(providerMessageId: string): Promise<void> {
            if (options.transport === 'console') {
                console.info(`[whatsapp:console] markMessageAsRead id=${providerMessageId}`);
                return;
            }

            try {
                await metaMessagesPost({
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: providerMessageId,
                });
            } catch (error) {
                options.log.error(
                    error instanceof Error ? new Error(`whatsapp.markMessageAsRead failed: ${error.message}`, { cause: error }) : error,
                    null,
                );
            }
        },

        webhookSignatureVerify({ rawBody, signatureHeader }): boolean {
            const appSecret = options.appSecret?.trim();
            if (!appSecret || !signatureHeader) {
                return false;
            }
            const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
            const prefix = 'sha256=';
            if (!signatureHeader.startsWith(prefix)) {
                return false;
            }
            const received = signatureHeader.slice(prefix.length);
            try {
                const expectedBuf = Buffer.from(expected, 'utf8');
                const receivedBuf = Buffer.from(received, 'utf8');
                return expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
            } catch {
                options.log.debug('whatsapp.webhookSignatureVerify: compare failed');
                return false;
            }
        },
    };
}
