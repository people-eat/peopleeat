/**
 * Minimal `process.env`-shaped source for unit tests that call
 * `environmentVariablesCreate(source)`. Uses `console` transports so Resend /
 * Slack provider credentials are not required.
 */
export function environmentVariablesTestSource(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return {
        DATABASE_URL: 'postgres://x',
        sessionCookieName: 'sid',
        WEB_PAGE_URL: 'https://example.com',
        VISITOR_IP_HASH_SALT: 'test-salt',
        GOOGLE_GENERATIVE_AI_API_KEY: 'test-google-ai',
        GOOGLE_PLACES_API_KEY: 'test-google-places',
        SERVER_TOKEN_SECRET: 'test-server-token-secret',
        AUTH_OTP_PEPPER: 'test-otp-pepper',
        AUTH_TOTP_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        STRIPE_SECRET_KEY: 'sk_test_placeholder',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_placeholder',
        LIVEKIT_URL: 'wss://livekit.example.com',
        LIVEKIT_API_KEY: 'test-livekit-key',
        LIVEKIT_API_SECRET: 'test-livekit-secret',
        OBJECT_STORAGE_S3_BUCKET: 'test-bucket',
        OBJECT_STORAGE_S3_ENDPOINT: 'https://garage.example.com',
        OBJECT_STORAGE_S3_REGION: 'garage',
        OBJECT_STORAGE_S3_ACCESS_KEY_ID: 'test-access-key',
        OBJECT_STORAGE_S3_SECRET_ACCESS_KEY: 'test-secret-key',
        RECAPTCHA_SECRET_KEY: 'test-recaptcha-secret',
        RECAPTCHA_SITE_KEY: 'test-recaptcha-site',
        KLAVIYO_PRIVATE_API_KEY: 'pk_klaviyo_test',
        EMAIL_TRANSPORT: 'console',
        SLACK_TRANSPORT: 'console',
        WHATSAPP_TRANSPORT: 'console',
        LANGFUSE_TRANSPORT: 'off',
        OTEL_TRANSPORT: 'off',
        NODE_ENV: 'test',
        ...overrides,
    };
}
