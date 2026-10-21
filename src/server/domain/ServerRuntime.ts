import type { LanguageModel, Tool } from 'ai';
import type { JobWithMetadata } from 'pg-boss';
import type { ReactElement } from 'react';
import type { Locale } from '../../shared/locale';
import type { Database, DatabaseTransaction } from '../db';
import type { QueuedJobDefinition } from '../jobs/types';
import type { Klaviyo } from '../klaviyo/Klaviyo';
import type { LiveKit } from '../livekit/LiveKit';
import type { ObjectStorage } from '../objectStorage/ObjectStorage';
import type { Places } from '../places/Places';
import type { Slack } from '../slack/Slack';
import type { StripePayment } from '../stripe/StripePayment';
import type { AiGenerationsRecorder } from '../utils/aiGenerationsCreate';
import type { BrowserCaptureOptions, BrowserCapturePdfOptions } from '../utils/browserCapture';
import type { Logger } from '../utils/loggerCreate';
import type { WhatsAppTemplateOutboundArgs, WhatsAppTextOutboundArgs } from '../utils/whatsappOutboundSend';
import type { EmailUsage, OutboundEmailPurpose, OutboundEmailRelatedEntityType } from './outboundEmail';

type EmailSendAttachment = {
    filename: string;
    content: Buffer;
    mediaType: string;
    /** When set, a row is inserted into `OutboundEmailAttachments` after the email row. */
    fileUploadId?: string;
};

type EmailSendArgs = {
    to: string;
    subject: string;
    react: ReactElement;
    purpose: OutboundEmailPurpose;
    locale: Locale;
    relatedEntity?: { type: OutboundEmailRelatedEntityType; id: string };
    userId?: string | null;
    attachments?: ReadonlyArray<EmailSendAttachment>;
};

/** Lean NOTIFY payload — resolver reloads the turn aggregate by id. */
export type ChatTurnUpdateWirePayload = {
    chatId: string;
    chatTurnId: string;
    revision: number;
};

export interface ServerRuntime {
    db: Database;
    log: Logger;
    // One-shot LLM call ledger (menu suggestions, titles, transcripts, …).
    // Fire-and-forget inserts — see `docs/architecture/ai-generations.md`.
    aiGenerations: AiGenerationsRecorder;
    subscribe: {
        to: (key: string) => AsyncIterableIterator<any>;
    };
    publish: {
        userUpdates: (args: { userId: string }) => Promise<void>;
        // Chat-scoped turn snapshots. Wire carries ids + revision; the
        // subscription resolver reloads the aggregate (pg_notify 8 KB cap).
        chatTurnUpdates: (args: ChatTurnUpdateWirePayload) => Promise<void>;
        // Session-owned auth UI state (pending email OTP). Channel key is
        // `session-updates:{sessionId}` so session UUIDs never collide with
        // `userUpdates` keys. Resolver reloads the Session (incl. authEmailOtp).
        sessionUpdates: (args: { sessionId: string }) => Promise<void>;
        // Shared admin catalog (legal drafts/publish, …). Single channel
        // `admin-updates` so every connected admin UI refreshes. Resolver
        // returns the empty `Admin` shell; child fields re-resolve.
        adminUpdates: () => Promise<void>;
    };
    email: {
        send: (args: EmailSendArgs) => Promise<{ outboundEmailId: string }>;
        // Live Resend account quota. Null when `EMAIL_TRANSPORT=console`.
        // Throws when the Resend usage API fails (same as `send`).
        usageGet: () => Promise<EmailUsage | null>;
    };
    jobs: {
        enqueue: <TData>(
            definition: QueuedJobDefinition<TData>,
            data: TData,
            options?: {
                startAfter?: Date | string | number;
                transaction?: DatabaseTransaction;
                id?: string;
                singletonKey?: string;
            },
        ) => Promise<string | null>;
        // Count active (created | retry | active) jobs for a queue. Used to
        // derive live UI flags from pg-boss without a stale column on domain
        // rows — pg-boss owns the state.
        activeCount: <TData>(definition: QueuedJobDefinition<TData>) => Promise<number>;
        // Find pending (or optionally all) jobs whose payload contains `data`.
        // Used by admin booking pages to list scheduled pull / reminder work.
        findByData: <TData>(
            definition: QueuedJobDefinition<TData>,
            data: Partial<TData> & object,
            options?: { queued?: boolean },
        ) => Promise<JobWithMetadata<TData>[]>;
        // Find pending (or optionally all) jobs by exact pg-boss job id.
        // Used for deterministic per-entity ids (e.g. cook biography summary).
        findById: <TData>(
            definition: QueuedJobDefinition<TData>,
            jobId: string,
            options?: { queued?: boolean },
        ) => Promise<JobWithMetadata<TData>[]>;
        // Cancel a previously enqueued job by queue name + id (e.g. gift-card
        // prepared-expire when payment succeeds). Missing/already-finished ids
        // are ignored by pg-boss.
        cancel: (queueName: string, jobId: string) => Promise<void>;
    };
    // LLM clients are exposed as factory functions on the runtime so the
    // provider, model id, and API key are bound in exactly one place
    // (`serverRuntimeCreate`). Tests build a runtime backed by a `MockLanguageModelV3`
    // and never reach a real LLM endpoint — see `commandTestUtils.ts` /
    // `serverRuntimeStubCreate` in command tests.
    ai: {
        // Assistant chat factories — optional `modelId` overrides the default
        // bound in `serverRuntimeCreate`. One factory per top-level agent so
        // model swaps stay independent — see `docs/features/assistants.md`.
        // Never reuse these for one-shot generations.
        customerAssistantModel: (modelId?: string) => LanguageModel;
        cookAssistantModel: (modelId?: string) => LanguageModel;
        adminAssistantModel: (modelId?: string) => LanguageModel;
        bookingRequestAssistantModel: (modelId?: string) => LanguageModel;
        // One-shot generation factories — named after the use case /
        // `AiGenerationKind`. See `docs/architecture/ai-generations.md`.
        chatTitlerModel: () => LanguageModel;
        cookMenuSuggestionModel: () => LanguageModel;
        cookMenuSuggestionFromInventoryModel: () => LanguageModel;
        cookMenuTitleDescriptionModel: () => LanguageModel;
        bookingRequestOfferCallRecordingTranscriptModel: () => LanguageModel;
        bookingRequestOfferCallRecordingSummaryModel: () => LanguageModel;
        cookBiographySuggestModel: () => LanguageModel;
        cookBiographySummaryModel: () => LanguageModel;
        cookMenuEvaluationModel: () => LanguageModel;
        bookingRequestAdjustedMessageModel: () => LanguageModel;
        // Provider-executed web search (Gemini Google Search grounding).
        // Exposed as a factory so `@ai-sdk/google` stays out of agent files.
        webSearchTool: () => Tool;
    };
    // Server-side rendering capability — drives a singleton headless
    // Chromium against an internal `/server/*` route to produce an image
    // (`capture`) or a PDF (`capturePdf`) of the rendered React UI. See
    // `docs/architecture/browser-capture.md`. Tests inject a stub
    // that returns a fixed `Buffer` and never launch a real browser.
    browser: {
        capture: (options: BrowserCaptureOptions) => Promise<Buffer>;
        capturePdf: (options: BrowserCapturePdfOptions) => Promise<Buffer>;
    };
    // Stripe Connect payment capability (customers, SetupIntents,
    // PaymentIntents, Express connected accounts, transfers, webhooks).
    // Implementation: `stripePaymentCreate`. See
    // `docs/architecture/stripe-payment.md`. Env required at boot.
    stripe: StripePayment;
    // LiveKit video rooms for booking-request offers. Env required at boot.
    // See docs/features/booking-request-offer-calls.md.
    livekit: LiveKit;
    // Shared Garage (S3) object store for binaries that outgrow Postgres
    // FileUploads. First consumer: call-recording audio. Env required at boot.
    // See docs/architecture/file-storage.md.
    objectStorage: ObjectStorage;
    // Google Places (Autocomplete / Text Search) for cook travel origin and
    // city geocoding. Env required at boot. See `docs/features/cook-profile.md`.
    places: Places;
    // Slack ops notifications (booking threads, sign-ups, support, …).
    // `SLACK_TRANSPORT=console` logs locally; `slack` posts via Web API.
    // See `docs/features/slack-notifications.md`.
    slack: Slack;
    // Klaviyo marketing profile sync (not transactional mail — Resend owns that).
    // Env required at boot. See `docs/features/klaviyo-profile-sync.md`.
    klaviyo: Klaviyo;
    // WhatsApp Cloud API (templates + Concierge session replies).
    // `WHATSAPP_TRANSPORT=console` logs locally; `meta` calls Graph API.
    // See `docs/architecture/whatsapp.md`.
    whatsapp: {
        sendTemplate: (args: WhatsAppTemplateOutboundArgs) => Promise<{ outboundWhatsAppMessageId: string } | null>;
        sendText: (args: WhatsAppTextOutboundArgs) => Promise<{ outboundWhatsAppMessageId: string; whatsAppMessageId: string }>;
        sendReaction: (args: {
            toPhoneNumber: string;
            providerMessageId: string;
            emoji: string;
        }) => Promise<{ providerMessageId: string | null }>;
        downloadMedia: (mediaId: string) => Promise<{ buffer: Buffer; mimeType: string } | null>;
        markMessageAsRead: (providerMessageId: string) => Promise<void>;
        webhookSignatureVerify: (args: { rawBody: string; signatureHeader: string | null }) => boolean;
    };
}
