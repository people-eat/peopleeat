import { afterEach, describe, expect, it, vi } from 'vitest';

import { environmentVariablesCreate } from './environmentVariablesCreate';
import { environmentVariablesTestSource } from './environmentVariablesTestSource';

describe('environmentVariablesCreate', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns a populated Env when all always-required vars are set with console transports', () => {
        const environmentVariables = environmentVariablesCreate(
            environmentVariablesTestSource({
                sessionCookieSecure: 'true',
                sessionCookieDomainScope: '.example.com',
                BUILD_SHA: 'abc123',
            }),
        );

        expect(environmentVariables).toEqual({
            databaseUrl: 'postgres://x',
            sessionCookie: {
                name: 'sid',
                secure: true,
                domainScope: '.example.com',
            },
            buildSha: 'abc123',
            webPageUrl: 'https://example.com',
            googleGenerativeAiApiKey: 'test-google-ai',
            googlePlacesApiKey: 'test-google-places',
            serverTokenSecret: 'test-server-token-secret',
            visitorIpHashSalt: 'test-salt',
            emailTransport: 'console',
            resendApiKey: undefined,
            resendFromEmail: undefined,
            resendWebhookSecret: undefined,
            authOtpPepper: 'test-otp-pepper',
            authTotpEncryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            stripeSecretKey: 'sk_test_placeholder',
            stripeWebhookSecret: 'whsec_test_placeholder',
            stripePublishableKey: 'pk_test_placeholder',
            livekitUrl: 'wss://livekit.example.com',
            livekitApiKey: 'test-livekit-key',
            livekitApiSecret: 'test-livekit-secret',
            livekitRoomPrefix: undefined,
            objectStorageS3Bucket: 'test-bucket',
            objectStorageS3Endpoint: 'https://garage.example.com',
            objectStorageS3Region: 'garage',
            objectStorageS3AccessKeyId: 'test-access-key',
            objectStorageS3SecretAccessKey: 'test-secret-key',
            objectStorageS3ForcePathStyle: true,
            recaptchaSecretKey: 'test-recaptcha-secret',
            recaptchaSiteKey: 'test-recaptcha-site',
            klaviyoPrivateApiKey: 'pk_klaviyo_test',
            klaviyoNewsletterListId: undefined,
            slackTransport: 'console',
            slackBotToken: undefined,
            slackChannelBookingRequests: undefined,
            slackChannelCashCows: undefined,
            slackChannelSignUps: undefined,
            slackChannelSupportRequests: undefined,
            slackChannelGiftCardPurchases: undefined,
            slackChannelBookingRequestReports: undefined,
            slackChannelOpsAlerts: undefined,
            slackChannelWhatsAppMessages: undefined,
            whatsappTransport: 'console',
            whatsappAccessToken: undefined,
            whatsappPhoneNumberId: undefined,
            whatsappBusinessAccountId: undefined,
            whatsappAppSecret: undefined,
            whatsappWebhookVerifyToken: undefined,
            chatDebugEnabled: true,
            langfuseTransport: 'off',
            langfusePublicKey: undefined,
            langfuseSecretKey: undefined,
            langfuseBaseUrl: 'https://cloud.langfuse.com',
            otelTransport: 'off',
            otelExporterOtlpEndpoint: undefined,
            otelExporterOtlpHeaders: undefined,
            observabilityEnvironment: 'test',
        });
    });

    it('reads OBJECT_STORAGE_S3_* into objectStorage fields', () => {
        const environmentVariables = environmentVariablesCreate(
            environmentVariablesTestSource({
                OBJECT_STORAGE_S3_BUCKET: 'bucket',
                OBJECT_STORAGE_S3_ENDPOINT: 'https://garage.example.com',
                OBJECT_STORAGE_S3_REGION: 'garage',
                OBJECT_STORAGE_S3_ACCESS_KEY_ID: 'key',
                OBJECT_STORAGE_S3_SECRET_ACCESS_KEY: 'secret',
                OBJECT_STORAGE_S3_FORCE_PATH_STYLE: 'false',
            }),
        );

        expect(environmentVariables.objectStorageS3Bucket).toBe('bucket');
        expect(environmentVariables.objectStorageS3Endpoint).toBe('https://garage.example.com');
        expect(environmentVariables.objectStorageS3ForcePathStyle).toBe(false);
    });

    it('parses EMAIL_TRANSPORT=console', () => {
        const environmentVariables = environmentVariablesCreate(environmentVariablesTestSource({ EMAIL_TRANSPORT: 'console' }));
        expect(environmentVariables.emailTransport).toBe('console');
    });

    it('requires Resend vars when EMAIL_TRANSPORT=resend', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    EMAIL_TRANSPORT: 'resend',
                }),
            ),
        ).toThrow(/RESEND_API_KEY/);

        const environmentVariables = environmentVariablesCreate(
            environmentVariablesTestSource({
                EMAIL_TRANSPORT: 'resend',
                RESEND_API_KEY: 're_test',
                RESEND_FROM_EMAIL: 'peopleeat@mail.example.com',
                RESEND_WEBHOOK_SECRET: 'whsec_resend',
            }),
        );
        expect(environmentVariables.emailTransport).toBe('resend');
        expect(environmentVariables.resendApiKey).toBe('re_test');
    });

    it('requires Slack vars when SLACK_TRANSPORT=slack', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    SLACK_TRANSPORT: 'slack',
                }),
            ),
        ).toThrow(/SLACK_BOT_TOKEN/);

        const environmentVariables = environmentVariablesCreate(
            environmentVariablesTestSource({
                SLACK_TRANSPORT: 'slack',
                SLACK_BOT_TOKEN: 'xoxb-test',
                SLACK_CHANNEL_BOOKING_REQUESTS: 'C1',
                SLACK_CHANNEL_CASH_COWS: 'C2',
                SLACK_CHANNEL_SIGN_UPS: 'C3',
                SLACK_CHANNEL_SUPPORT_REQUESTS: 'C4',
                SLACK_CHANNEL_GIFT_CARD_PURCHASES: 'C5',
                SLACK_CHANNEL_BOOKING_REQUEST_REPORTS: 'C6',
                SLACK_CHANNEL_OPS_ALERTS: 'C7',
                SLACK_CHANNEL_WHATSAPP_MESSAGES: 'C8',
            }),
        );
        expect(environmentVariables.slackTransport).toBe('slack');
        expect(environmentVariables.slackBotToken).toBe('xoxb-test');
        expect(environmentVariables.slackChannelWhatsAppMessages).toBe('C8');
    });

    it('rejects an invalid EMAIL_TRANSPORT', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    EMAIL_TRANSPORT: 'smtp',
                }),
            ),
        ).toThrow(/Invalid EMAIL_TRANSPORT/);
    });

    it('rejects an invalid SLACK_TRANSPORT', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    SLACK_TRANSPORT: 'webhook',
                }),
            ),
        ).toThrow(/Invalid SLACK_TRANSPORT/);
    });

    it('requires WhatsApp vars when WHATSAPP_TRANSPORT=meta', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    WHATSAPP_TRANSPORT: 'meta',
                }),
            ),
        ).toThrow(/WHATSAPP_ACCESS_TOKEN/);

        const environmentVariables = environmentVariablesCreate(
            environmentVariablesTestSource({
                WHATSAPP_TRANSPORT: 'meta',
                WHATSAPP_ACCESS_TOKEN: 'token',
                WHATSAPP_PHONE_NUMBER_ID: 'phone-number-id',
                WHATSAPP_BUSINESS_ACCOUNT_ID: 'business-account-id',
                WHATSAPP_APP_SECRET: 'secret',
                WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify',
            }),
        );
        expect(environmentVariables.whatsappTransport).toBe('meta');
        expect(environmentVariables.whatsappAccessToken).toBe('token');
    });

    it('rejects an invalid WHATSAPP_TRANSPORT', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    WHATSAPP_TRANSPORT: 'twilio',
                }),
            ),
        ).toThrow(/Invalid WHATSAPP_TRANSPORT/);
    });

    it('treats sessionCookieSecure other than "true" as false', () => {
        const environmentVariables = environmentVariablesCreate(environmentVariablesTestSource());
        expect(environmentVariables.sessionCookie.secure).toBe(false);
    });

    it('defaults buildSha to "unknown" when BUILD_SHA is not set', () => {
        const environmentVariables = environmentVariablesCreate(environmentVariablesTestSource());
        expect(environmentVariables.buildSha).toBe('unknown');
    });

    it('strips a trailing slash from WEB_PAGE_URL', () => {
        const environmentVariables = environmentVariablesCreate(environmentVariablesTestSource({ WEB_PAGE_URL: 'https://example.com/' }));
        expect(environmentVariables.webPageUrl).toBe('https://example.com');
    });

    it('logs and throws listing every missing always-required variable', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(() => environmentVariablesCreate({})).toThrow(/DATABASE_URL/);
        expect(() => environmentVariablesCreate({})).toThrow(/GOOGLE_GENERATIVE_AI_API_KEY/);
        expect(() => environmentVariablesCreate({})).toThrow(/STRIPE_SECRET_KEY/);
        expect(() => environmentVariablesCreate({})).toThrow(/KLAVIYO_PRIVATE_API_KEY/);
        expect(errorSpy).toHaveBeenCalled();
        expect(String(errorSpy.mock.calls[0]?.[0])).toContain('Missing required environment variables:');
        expect(String(errorSpy.mock.calls[0]?.[0])).toContain('- DATABASE_URL');
    });

    it('does not require Resend or Slack credentials when both transports are console', () => {
        expect(() => environmentVariablesCreate(environmentVariablesTestSource())).not.toThrow();
    });

    it('requires Langfuse keys when LANGFUSE_TRANSPORT=cloud', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    LANGFUSE_TRANSPORT: 'cloud',
                }),
            ),
        ).toThrow(/LANGFUSE_PUBLIC_KEY/);

        const environmentVariables = environmentVariablesCreate(
            environmentVariablesTestSource({
                LANGFUSE_TRANSPORT: 'cloud',
                LANGFUSE_PUBLIC_KEY: 'pk-lf-test',
                LANGFUSE_SECRET_KEY: 'sk-lf-test',
                LANGFUSE_BASE_URL: 'https://cloud.langfuse.com/',
            }),
        );
        expect(environmentVariables.langfuseTransport).toBe('cloud');
        expect(environmentVariables.langfusePublicKey).toBe('pk-lf-test');
        expect(environmentVariables.langfuseBaseUrl).toBe('https://cloud.langfuse.com');
    });

    it('requires OTLP endpoint when OTEL_TRANSPORT=otlp', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    OTEL_TRANSPORT: 'otlp',
                }),
            ),
        ).toThrow(/OTEL_EXPORTER_OTLP_ENDPOINT/);

        const environmentVariables = environmentVariablesCreate(
            environmentVariablesTestSource({
                OTEL_TRANSPORT: 'otlp',
                OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otlp.example.com',
                OTEL_EXPORTER_OTLP_HEADERS: 'Authorization=Basic abc',
            }),
        );
        expect(environmentVariables.otelTransport).toBe('otlp');
        expect(environmentVariables.otelExporterOtlpEndpoint).toBe('https://otlp.example.com');
    });

    it('rejects an invalid LANGFUSE_TRANSPORT', () => {
        expect(() =>
            environmentVariablesCreate(
                environmentVariablesTestSource({
                    LANGFUSE_TRANSPORT: 'self-hosted',
                }),
            ),
        ).toThrow(/Invalid LANGFUSE_TRANSPORT/);
    });
});
