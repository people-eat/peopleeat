import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { db } from '../db';
import { outboundEmailAttachments, outboundEmails } from '../db/schema';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { PubSubPostgres } from '../graphql/PubSubPostgres';
import { jobCancel, jobEnqueue, jobsActiveCount, jobsFindByData, jobsFindById } from '../jobs/boss';
import { klaviyoCreate } from '../klaviyo/klaviyoCreate';
import { livekitCreate } from '../livekit/livekitCreate';
import { objectStorageCreate } from '../objectStorage/objectStorageCreate';
import { placesCreate } from '../places/placesCreate';
import { slackCreate } from '../slack/slackCreate';
import { stripePaymentCreate } from '../stripe/stripePaymentCreate';
import { aiGenerationsCreate } from '../utils/aiGenerationsCreate';
import { browserCapture, browserCapturePdf } from '../utils/browserCapture';
import { emailFromHeader } from '../utils/emailFromHeader';
import { loggerCreate } from '../utils/loggerCreate';
import { resendSendRateLimit } from '../utils/resendSendRateLimit';
import { whatsappTemplateOutboundSend, whatsappTextOutboundSend } from '../utils/whatsappOutboundSend';
import { whatsappCreate } from '../whatsapp/whatsappCreate';
import type { ServerRuntime } from './ServerRuntime';

export function serverRuntimeCreate(): ServerRuntime {
    const postgresPubSub = new PubSubPostgres({ db });
    const log = loggerCreate(db);

    async function publish(keys: Array<string> | string, payload: any) {
        await (typeof keys === 'string'
            ? postgresPubSub.publish(keys, payload)
            : Promise.all(keys.map((key: string) => postgresPubSub.publish(key, payload))));
    }

    // Boot validation already requires GOOGLE_GENERATIVE_AI_API_KEY. Bind it
    // here so the AI SDK never reads `process.env` implicitly. Tests build a
    // `ServerRuntime` directly and skip this path entirely.
    const google = createGoogleGenerativeAI({ apiKey: environmentVariables.googleGenerativeAiApiKey });

    const serverRuntime: ServerRuntime = {
        db,
        log,
        aiGenerations: aiGenerationsCreate(db),
        subscribe: {
            to: (key: string) => postgresPubSub.asyncIterableIterator([key]),
        },
        publish: {
            userUpdates: ({ userId }) => publish(userId, {}),
            // Chat-scoped turn updates. Wire payload is lean (ids + revision);
            // the subscription resolver reloads the turn aggregate.
            chatTurnUpdates: ({ chatId, chatTurnId, revision }) => publish(`chat-turn-updates:${chatId}`, { chatId, chatTurnId, revision }),
            sessionUpdates: ({ sessionId }) => publish(`session-updates:${sessionId}`, {}),
            adminUpdates: () => publish('admin-updates', {}),
        },
        jobs: {
            enqueue: jobEnqueue,
            activeCount: jobsActiveCount,
            findByData: jobsFindByData,
            findById: jobsFindById,
            cancel: jobCancel,
        },
        ai: {
            // Bound here so model id, provider, and credentials live in one
            // place. Assistant factories stay separate from one-shot
            // generation factories so defaults can diverge without
            // cross-use-case bleed. Optional `modelId` overrides an
            // assistant factory's default for a single call.
            customerAssistantModel: (modelId?: string) => google(modelId ?? 'gemini-2.5-flash'),
            cookAssistantModel: (modelId?: string) => google(modelId ?? 'gemini-2.5-flash'),
            adminAssistantModel: (modelId?: string) => google(modelId ?? 'gemini-2.5-flash'),
            bookingRequestAssistantModel: (modelId?: string) => google(modelId ?? 'gemini-2.5-flash'),
            // One-shot use cases — dedicated slots; never reuse assistant models.
            chatTitlerModel: () => google('gemini-3.5-flash-lite'),
            cookMenuSuggestionModel: () => google('gemini-2.5-flash'),
            cookMenuSuggestionFromInventoryModel: () => google('gemini-2.5-flash'),
            cookMenuTitleDescriptionModel: () => google('gemini-2.5-flash'),
            bookingRequestOfferCallRecordingTranscriptModel: () => google('gemini-2.5-flash'),
            cookBiographySuggestModel: () => google('gemini-2.5-flash'),
            cookBiographySummaryModel: () => google('gemini-2.5-flash'),
            cookMenuEvaluationModel: () => google('gemini-2.5-flash'),
            // Google Search grounding. Gemini executes the search itself and
            // rides the result back on the same tool-call channel as function
            // tools. Agents wrap this via a `delegateTo*` / web-search tool
            // when product surfaces need it.
            webSearchTool: () => google.tools.googleSearch({}),
        },

        email: {
            async send({ to, subject, react, purpose, locale, relatedEntity, userId, attachments }) {
                const { emailTransport, resendApiKey, resendFromEmail } = environmentVariables;
                const outboundEmailId = idCreate();
                const provider = emailTransport === 'console' ? 'console' : 'resend';
                const now = new Date();
                // Inbox clients show the display name; `RESEND_FROM_EMAIL` stays a bare address.
                const fromEmail = resendFromEmail ? emailFromHeader(resendFromEmail) : null;

                await db.insert(outboundEmails).values({
                    outboundEmailId,
                    provider,
                    purpose,
                    relatedEntityType: relatedEntity?.type ?? null,
                    relatedEntityId: relatedEntity?.id ?? null,
                    userId: userId ?? null,
                    toEmail: to,
                    fromEmail,
                    subject,
                    locale,
                    createdAt: now,
                });

                const attachmentRows = (attachments ?? []).flatMap((attachment, position) =>
                    attachment.fileUploadId
                        ? [
                              {
                                  outboundEmailId,
                                  fileUploadId: attachment.fileUploadId,
                                  position,
                              },
                          ]
                        : [],
                );
                if (attachmentRows.length > 0) {
                    await db.insert(outboundEmailAttachments).values(attachmentRows);
                }

                try {
                    if (emailTransport === 'console') {
                        // Dev/local preview — print plaintext so OTP codes are
                        // readable in the terminal. Do not route through
                        // `serverRuntime.log` (that persists to Postgres).
                        const { render, toPlainText } = await import('react-email');
                        const text = toPlainText(await render(react));
                        const attachmentSummary =
                            attachments && attachments.length > 0
                                ? ` attachments=${attachments.map((a) => `${a.filename}(${a.mediaType},${a.content.byteLength}b)`).join(',')}`
                                : '';
                        console.info(`[email:console] to=${to} subject=${subject}${attachmentSummary}\n${text}`);
                        await db
                            .update(outboundEmails)
                            .set({ sentAt: new Date() })
                            .where(eq(outboundEmails.outboundEmailId, outboundEmailId));
                        return { outboundEmailId };
                    }

                    // Boot requires RESEND_* when EMAIL_TRANSPORT=resend.
                    if (!resendApiKey || !fromEmail) {
                        throw new Error('serverRuntime.email.send: Resend credentials missing for resend transport');
                    }
                    // Stay under Resend's default 10 req/s team limit (bulk cook notify, etc.).
                    await resendSendRateLimit.acquire();
                    const { Resend } = await import('resend');
                    const resend = new Resend(resendApiKey);
                    const result = await resend.emails.send({
                        from: fromEmail,
                        to,
                        subject,
                        react,
                        attachments: attachments?.map((attachment) => ({
                            filename: attachment.filename,
                            content: attachment.content,
                            contentType: attachment.mediaType,
                        })),
                    });
                    if (result.error) {
                        throw new Error(`Resend email send failed: ${result.error.message}`);
                    }
                    await db
                        .update(outboundEmails)
                        .set({
                            providerMessageId: result.data.id,
                            sentAt: new Date(),
                        })
                        .where(eq(outboundEmails.outboundEmailId, outboundEmailId));
                    return { outboundEmailId };
                } catch (error) {
                    const failureReason = error instanceof Error ? error.message.slice(0, 500) : 'Outbound email send failed';
                    await db
                        .update(outboundEmails)
                        .set({ failedAt: new Date(), failureReason })
                        .where(eq(outboundEmails.outboundEmailId, outboundEmailId));
                    throw error;
                }
            },
            async usageGet() {
                const { emailTransport, resendApiKey } = environmentVariables;
                if (emailTransport === 'console' || !resendApiKey) {
                    return null;
                }

                const { Resend } = await import('resend');
                const resend = new Resend(resendApiKey);
                const result = await resend.usage.get();
                if (result.error) {
                    throw new Error(`Resend usage get failed: ${result.error.message}`);
                }

                const { monthly, daily } = result.data.emails;
                return {
                    monthly: {
                        used: monthly.used,
                        limit: monthly.limit,
                        sent: monthly.sent,
                        received: monthly.received,
                        resetsAt: new Date(monthly.resets_at),
                    },
                    daily: {
                        used: daily.used,
                        limit: daily.limit,
                        sent: daily.sent,
                        received: daily.received,
                        resetsAt: new Date(daily.resets_at),
                    },
                };
            },
        },
        browser: {
            // The renderer is a long-lived singleton inside `browserCapture`;
            // `serverRuntimeCreate` just exposes the entry point. Tests build
            // a `ServerRuntime` directly and stub `browser.capture` /
            // `browser.capturePdf` — they never launch a real Chromium.
            capture: browserCapture,
            capturePdf: browserCapturePdf,
        },
        stripe: stripePaymentCreate({
            secretKey: environmentVariables.stripeSecretKey,
            webhookSecret: environmentVariables.stripeWebhookSecret,
            businessProfileUrl: environmentVariables.webPageUrl,
        }),
        livekit: livekitCreate({
            url: environmentVariables.livekitUrl,
            apiKey: environmentVariables.livekitApiKey,
            apiSecret: environmentVariables.livekitApiSecret,
            roomPrefix: environmentVariables.livekitRoomPrefix,
            webPageUrl: environmentVariables.webPageUrl,
        }),
        objectStorage: objectStorageCreate({
            bucket: environmentVariables.objectStorageS3Bucket,
            endpoint: environmentVariables.objectStorageS3Endpoint,
            region: environmentVariables.objectStorageS3Region,
            accessKeyId: environmentVariables.objectStorageS3AccessKeyId,
            secretAccessKey: environmentVariables.objectStorageS3SecretAccessKey,
            forcePathStyle: environmentVariables.objectStorageS3ForcePathStyle,
        }),
        places: placesCreate({
            apiKey: environmentVariables.googlePlacesApiKey,
        }),
        slack: slackCreate({
            transport: environmentVariables.slackTransport,
            botToken: environmentVariables.slackBotToken,
            channels: {
                bookingRequests: environmentVariables.slackChannelBookingRequests,
                cashCows: environmentVariables.slackChannelCashCows,
                signUps: environmentVariables.slackChannelSignUps,
                supportRequests: environmentVariables.slackChannelSupportRequests,
                giftCardPurchases: environmentVariables.slackChannelGiftCardPurchases,
                bookingRequestReports: environmentVariables.slackChannelBookingRequestReports,
                opsAlerts: environmentVariables.slackChannelOpsAlerts,
                whatsAppMessages: environmentVariables.slackChannelWhatsAppMessages,
            },
            log,
        }),
        klaviyo: klaviyoCreate({
            privateApiKey: environmentVariables.klaviyoPrivateApiKey,
            newsletterListId: environmentVariables.klaviyoNewsletterListId,
            log,
        }),
        // Filled after the object exists so send helpers can close over `serverRuntime`.
        whatsapp: null as unknown as ServerRuntime['whatsapp'],
    };

    const whatsappProvider = whatsappCreate({
        transport: environmentVariables.whatsappTransport,
        accessToken: environmentVariables.whatsappAccessToken,
        phoneNumberId: environmentVariables.whatsappPhoneNumberId,
        appSecret: environmentVariables.whatsappAppSecret,
        log,
    });
    serverRuntime.whatsapp = {
        sendTemplate: (args) => whatsappTemplateOutboundSend(serverRuntime, whatsappProvider, args),
        sendText: (args) => whatsappTextOutboundSend(serverRuntime, whatsappProvider, args),
        downloadMedia: (mediaId) => whatsappProvider.downloadMedia(mediaId),
        markMessageAsRead: (providerMessageId) => whatsappProvider.markMessageAsRead(providerMessageId),
        webhookSignatureVerify: (args) => whatsappProvider.webhookSignatureVerify(args),
    };

    return serverRuntime;
}
