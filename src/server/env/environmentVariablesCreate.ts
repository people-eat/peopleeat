import type { EnvironmentVariables } from './EnvironmentVariables';

const alwaysRequiredEnvironmentVariables = [
    'DATABASE_URL',
    'sessionCookieName',
    'WEB_PAGE_URL',
    'VISITOR_IP_HASH_SALT',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'GOOGLE_PLACES_API_KEY',
    'SERVER_TOKEN_SECRET',
    'AUTH_OTP_PEPPER',
    'AUTH_TOTP_ENCRYPTION_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PUBLISHABLE_KEY',
    'LIVEKIT_URL',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'OBJECT_STORAGE_S3_BUCKET',
    'OBJECT_STORAGE_S3_ENDPOINT',
    'OBJECT_STORAGE_S3_REGION',
    'OBJECT_STORAGE_S3_ACCESS_KEY_ID',
    'OBJECT_STORAGE_S3_SECRET_ACCESS_KEY',
    'RECAPTCHA_SECRET_KEY',
    'RECAPTCHA_SITE_KEY',
    'KLAVIYO_PRIVATE_API_KEY',
] as const;

const resendRequiredEnvironmentVariables = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_WEBHOOK_SECRET'] as const;

const slackRequiredEnvironmentVariables = [
    'SLACK_BOT_TOKEN',
    'SLACK_CHANNEL_BOOKING_REQUESTS',
    'SLACK_CHANNEL_CASH_COWS',
    'SLACK_CHANNEL_SIGN_UPS',
    'SLACK_CHANNEL_SUPPORT_REQUESTS',
    'SLACK_CHANNEL_GIFT_CARD_PURCHASES',
    'SLACK_CHANNEL_BOOKING_REQUEST_REPORTS',
    'SLACK_CHANNEL_OPS_ALERTS',
    'SLACK_CHANNEL_WHATSAPP_MESSAGES',
] as const;

const whatsappRequiredEnvironmentVariables = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_APP_SECRET',
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
] as const;

const langfuseRequiredEnvironmentVariables = ['LANGFUSE_PUBLIC_KEY', 'LANGFUSE_SECRET_KEY'] as const;

const otlpRequiredEnvironmentVariables = ['OTEL_EXPORTER_OTLP_ENDPOINT'] as const;

const emailTransports = ['resend', 'console'] as const;
type EmailTransport = (typeof emailTransports)[number];

const slackTransports = ['slack', 'console'] as const;
type SlackTransport = (typeof slackTransports)[number];

const whatsappTransports = ['meta', 'console'] as const;
type WhatsAppTransport = (typeof whatsappTransports)[number];

const langfuseTransports = ['off', 'cloud'] as const;
type LangfuseTransport = (typeof langfuseTransports)[number];

const otelTransports = ['off', 'otlp', 'console'] as const;
type OtelTransport = (typeof otelTransports)[number];

function emailTransportParse(raw: string | undefined): EmailTransport {
    const value = raw ?? 'resend';
    if (!(emailTransports as readonly string[]).includes(value)) {
        throw new Error(`Invalid EMAIL_TRANSPORT "${value}". Expected one of: ${emailTransports.join(', ')}`);
    }
    return value as EmailTransport;
}

function slackTransportParse(raw: string | undefined): SlackTransport {
    const value = raw ?? 'slack';
    if (!(slackTransports as readonly string[]).includes(value)) {
        throw new Error(`Invalid SLACK_TRANSPORT "${value}". Expected one of: ${slackTransports.join(', ')}`);
    }
    return value as SlackTransport;
}

function whatsappTransportParse(raw: string | undefined): WhatsAppTransport {
    const value = raw ?? 'meta';
    if (!(whatsappTransports as readonly string[]).includes(value)) {
        throw new Error(`Invalid WHATSAPP_TRANSPORT "${value}". Expected one of: ${whatsappTransports.join(', ')}`);
    }
    return value as WhatsAppTransport;
}

function langfuseTransportParse(raw: string | undefined): LangfuseTransport {
    const value = raw ?? 'off';
    if (!(langfuseTransports as readonly string[]).includes(value)) {
        throw new Error(`Invalid LANGFUSE_TRANSPORT "${value}". Expected one of: ${langfuseTransports.join(', ')}`);
    }
    return value as LangfuseTransport;
}

function otelTransportParse(raw: string | undefined): OtelTransport {
    const value = raw ?? 'off';
    if (!(otelTransports as readonly string[]).includes(value)) {
        throw new Error(`Invalid OTEL_TRANSPORT "${value}". Expected one of: ${otelTransports.join(', ')}`);
    }
    return value as OtelTransport;
}

function observabilityEnvironmentParse(raw: string | undefined, nodeEnv: string | undefined): string {
    if (raw?.trim()) {
        return raw.trim();
    }
    if (nodeEnv === 'production') {
        return 'production';
    }
    if (nodeEnv === 'test') {
        return 'test';
    }
    return 'development';
}

function missingEnvironmentVariablesReport(missing: string[]): never {
    const list = missing.map((name) => `  - ${name}`).join('\n');
    const message = `Missing required environment variables:\n${list}`;
    console.error(message);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export function environmentVariablesCreate(source: NodeJS.ProcessEnv = process.env): EnvironmentVariables {
    const emailTransport = emailTransportParse(source.EMAIL_TRANSPORT);
    const slackTransport = slackTransportParse(source.SLACK_TRANSPORT);
    const whatsappTransport = whatsappTransportParse(source.WHATSAPP_TRANSPORT);
    const langfuseTransport = langfuseTransportParse(source.LANGFUSE_TRANSPORT);
    const otelTransport = otelTransportParse(source.OTEL_TRANSPORT);

    const required: string[] = [...alwaysRequiredEnvironmentVariables];
    if (emailTransport === 'resend') {
        required.push(...resendRequiredEnvironmentVariables);
    }
    if (slackTransport === 'slack') {
        required.push(...slackRequiredEnvironmentVariables);
    }
    if (whatsappTransport === 'meta') {
        required.push(...whatsappRequiredEnvironmentVariables);
    }
    if (langfuseTransport === 'cloud') {
        required.push(...langfuseRequiredEnvironmentVariables);
    }
    if (otelTransport === 'otlp') {
        required.push(...otlpRequiredEnvironmentVariables);
    }

    const missing = required.filter((name) => !source[name]);
    if (missing.length > 0) {
        missingEnvironmentVariablesReport(missing);
    }

    return {
        databaseUrl: source.DATABASE_URL!,
        sessionCookie: {
            name: source.sessionCookieName!,
            secure: source.sessionCookieSecure === 'true',
            domainScope: source.sessionCookieDomainScope,
        },
        buildSha: source.BUILD_SHA ?? 'unknown',
        webPageUrl: source.WEB_PAGE_URL!.replace(/\/$/, ''),
        googleGenerativeAiApiKey: source.GOOGLE_GENERATIVE_AI_API_KEY!,
        googlePlacesApiKey: source.GOOGLE_PLACES_API_KEY!,
        serverTokenSecret: source.SERVER_TOKEN_SECRET!,
        visitorIpHashSalt: source.VISITOR_IP_HASH_SALT!,
        emailTransport,
        resendApiKey: source.RESEND_API_KEY,
        resendFromEmail: source.RESEND_FROM_EMAIL,
        resendWebhookSecret: source.RESEND_WEBHOOK_SECRET,
        authOtpPepper: source.AUTH_OTP_PEPPER!,
        authTotpEncryptionKey: source.AUTH_TOTP_ENCRYPTION_KEY!,
        stripeSecretKey: source.STRIPE_SECRET_KEY!,
        stripeWebhookSecret: source.STRIPE_WEBHOOK_SECRET!,
        stripePublishableKey: source.STRIPE_PUBLISHABLE_KEY!,
        livekitUrl: source.LIVEKIT_URL!,
        livekitApiKey: source.LIVEKIT_API_KEY!,
        livekitApiSecret: source.LIVEKIT_API_SECRET!,
        livekitRoomPrefix: source.LIVEKIT_ROOM_PREFIX,
        objectStorageS3Bucket: source.OBJECT_STORAGE_S3_BUCKET!,
        objectStorageS3Endpoint: source.OBJECT_STORAGE_S3_ENDPOINT!,
        objectStorageS3Region: source.OBJECT_STORAGE_S3_REGION!,
        objectStorageS3AccessKeyId: source.OBJECT_STORAGE_S3_ACCESS_KEY_ID!,
        objectStorageS3SecretAccessKey: source.OBJECT_STORAGE_S3_SECRET_ACCESS_KEY!,
        objectStorageS3ForcePathStyle: source.OBJECT_STORAGE_S3_FORCE_PATH_STYLE !== 'false',
        recaptchaSecretKey: source.RECAPTCHA_SECRET_KEY!,
        recaptchaSiteKey: source.RECAPTCHA_SITE_KEY!,
        klaviyoPrivateApiKey: source.KLAVIYO_PRIVATE_API_KEY!,
        klaviyoNewsletterListId: source.KLAVIYO_NEWSLETTER_LIST_ID?.trim() || undefined,
        slackTransport,
        slackBotToken: source.SLACK_BOT_TOKEN,
        slackChannelBookingRequests: source.SLACK_CHANNEL_BOOKING_REQUESTS,
        slackChannelCashCows: source.SLACK_CHANNEL_CASH_COWS,
        slackChannelSignUps: source.SLACK_CHANNEL_SIGN_UPS,
        slackChannelSupportRequests: source.SLACK_CHANNEL_SUPPORT_REQUESTS,
        slackChannelGiftCardPurchases: source.SLACK_CHANNEL_GIFT_CARD_PURCHASES,
        slackChannelBookingRequestReports: source.SLACK_CHANNEL_BOOKING_REQUEST_REPORTS,
        slackChannelOpsAlerts: source.SLACK_CHANNEL_OPS_ALERTS,
        slackChannelWhatsAppMessages: source.SLACK_CHANNEL_WHATSAPP_MESSAGES,
        whatsappTransport,
        whatsappAccessToken: source.WHATSAPP_ACCESS_TOKEN,
        whatsappPhoneNumberId: source.WHATSAPP_PHONE_NUMBER_ID,
        whatsappBusinessAccountId: source.WHATSAPP_BUSINESS_ACCOUNT_ID,
        whatsappAppSecret: source.WHATSAPP_APP_SECRET,
        whatsappWebhookVerifyToken: source.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
        chatDebugEnabled: source.CHAT_DEBUG_ENABLED === 'true' || source.NODE_ENV !== 'production',
        langfuseTransport,
        langfusePublicKey: source.LANGFUSE_PUBLIC_KEY,
        langfuseSecretKey: source.LANGFUSE_SECRET_KEY,
        langfuseBaseUrl: (source.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com').replace(/\/$/, ''),
        otelTransport,
        otelExporterOtlpEndpoint: source.OTEL_EXPORTER_OTLP_ENDPOINT,
        otelExporterOtlpHeaders: source.OTEL_EXPORTER_OTLP_HEADERS,
        observabilityEnvironment: observabilityEnvironmentParse(source.OBSERVABILITY_ENVIRONMENT, source.NODE_ENV),
    };
}

let cachedEnvironmentVariables: EnvironmentVariables | undefined;

export const environmentVariables: EnvironmentVariables = new Proxy({} as EnvironmentVariables, {
    get(_target, property) {
        cachedEnvironmentVariables ??= environmentVariablesCreate();
        return cachedEnvironmentVariables[property as keyof EnvironmentVariables];
    },
});
