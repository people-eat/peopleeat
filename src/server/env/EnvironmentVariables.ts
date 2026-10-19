export interface SessionCookieConfiguration {
    name: string;
    secure: boolean;
    domainScope: string | undefined;
}

export interface EnvironmentVariables {
    databaseUrl: string;
    sessionCookie: SessionCookieConfiguration;
    buildSha: string;
    // Absolute origin of the deployed site (no trailing slash, e.g.
    // `https://example.com`). Single source of truth for SEO concerns —
    // canonical URLs, hreflang alternates, the dynamic sitemap.xml, and the
    // dynamic robots.txt all derive from this. See `docs/architecture/discovery-seo.md`.
    webPageUrl: string;
    googleGenerativeAiApiKey: string;
    googlePlacesApiKey: string;
    // HMAC secret for short-lived tokens that authenticate server-side renders
    // against `/server/*` routes. See `docs/architecture/browser-capture.md`.
    serverTokenSecret: string;
    // Per-deploy salt mixed into the SHA-256 of every visitor request's
    // client IP before it lands in `Sessions.ipHash`. Salting means a DB
    // leak does not expose visitor IPs and two deploys cannot be
    // cross-correlated. See `docs/architecture/authentication.md`.
    visitorIpHashSalt: string;

    // How `serverRuntime.email.send` delivers mail. `console` prints the
    // message (useful in local/dev); `resend` calls the Resend API. Defaults
    // to `resend` so production stays on real delivery when the var is unset.
    // See docs/infrastructure.md.
    emailTransport: 'resend' | 'console';
    // Present when `emailTransport` is `resend`; omitted when `console`.
    resendApiKey: string | undefined;
    // Bare address (e.g. `peopleeat@mail.people-eat.com`). `serverRuntime.email.send`
    // prefixes `SITE_NAME` as the display name (`peopleeat <…>`). Operators may
    // set a full `Name <addr>` value to override. Present when `emailTransport`
    // is `resend`; omitted when `console`.
    resendFromEmail: string | undefined;
    // Present when `emailTransport` is `resend`; omitted when `console`.
    resendWebhookSecret: string | undefined;
    authOtpPepper: string;
    // AES-256-GCM key as 64 hex chars (32 bytes). See docs/architecture/authentication.md.
    authTotpEncryptionKey: string;
    stripeSecretKey: string;
    stripeWebhookSecret: string;
    // Publishable key served to the browser for Stripe Elements (gift card /
    // booking checkout).
    stripePublishableKey: string;
    // LiveKit video calls on booking-request offers. See
    // docs/features/booking-request-offer-calls.md.
    livekitUrl: string;
    livekitApiKey: string;
    livekitApiSecret: string;
    /** Optional override for room-name prefix (default: WEB_PAGE_URL hostname). */
    livekitRoomPrefix: string | undefined;
    // Coolify-hosted Garage (S3 API) shared object store. See
    // docs/architecture/file-storage.md.
    objectStorageS3Bucket: string;
    objectStorageS3Endpoint: string;
    objectStorageS3Region: string;
    objectStorageS3AccessKeyId: string;
    objectStorageS3SecretAccessKey: string;
    /** Path-style for Garage/Traefik; default true when endpoint is set. */
    objectStorageS3ForcePathStyle: boolean;
    // Google reCAPTCHA v3 secret (server verify). See docs/features/gift-card-purchase.md.
    recaptchaSecretKey: string;
    // Google reCAPTCHA v3 site key (browser). Passed to the gift-card page via
    // the route loader.
    recaptchaSiteKey: string;
    // Klaviyo marketing profile sync. See docs/features/klaviyo-profile-sync.md.
    // Transactional mail stays on Resend (`serverRuntime.email`).
    klaviyoPrivateApiKey: string;
    /** Optional marketing list id for footer newsletter subscribe. */
    klaviyoNewsletterListId: string | undefined;
    // How `serverRuntime.slack` delivers ops posts. `console` prints to the
    // terminal (local/dev); `slack` calls the Slack Web API. Defaults to
    // `slack` so production stays on real posts when the var is unset.
    slackTransport: 'slack' | 'console';
    // Present when `slackTransport` is `slack`; omitted when `console`.
    slackBotToken: string | undefined;
    slackChannelBookingRequests: string | undefined;
    slackChannelCashCows: string | undefined;
    slackChannelSignUps: string | undefined;
    slackChannelSupportRequests: string | undefined;
    slackChannelGiftCardPurchases: string | undefined;
    slackChannelBookingRequestReports: string | undefined;
    slackChannelOpsAlerts: string | undefined;
    slackChannelWhatsAppMessages: string | undefined;
    // How `serverRuntime.whatsapp` delivers WhatsApp. `console` prints to the
    // terminal (local/dev); `meta` calls the Meta Cloud API. Defaults to
    // `meta` so production stays on real delivery when the var is unset.
    // See docs/architecture/whatsapp.md.
    whatsappTransport: 'meta' | 'console';
    // Present when `whatsappTransport` is `meta`; omitted when `console`.
    whatsappAccessToken: string | undefined;
    whatsappPhoneNumberId: string | undefined;
    whatsappBusinessAccountId: string | undefined;
    whatsappAppSecret: string | undefined;
    whatsappWebhookVerifyToken: string | undefined;
    // When true, chat turn GraphQL payloads include agent/model/usage debug.
    // Enabled explicitly via CHAT_DEBUG_ENABLED=true, or implicitly outside production.
    chatDebugEnabled: boolean;
    // OpenTelemetry / Langfuse — see docs/architecture/observability.md.
    // Defaults to `off` so local/test do not require vendor keys.
    langfuseTransport: 'off' | 'cloud';
    langfusePublicKey: string | undefined;
    langfuseSecretKey: string | undefined;
    langfuseBaseUrl: string;
    otelTransport: 'off' | 'otlp' | 'console';
    otelExporterOtlpEndpoint: string | undefined;
    otelExporterOtlpHeaders: string | undefined;
    observabilityEnvironment: string;
}
