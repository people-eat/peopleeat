import type { Locale } from '../../shared/locale';

export type KlaviyoProfileUpsertArgs = {
    /** Our `Users.userId` — stored as Klaviyo `external_id` so email changes update the same profile. */
    externalId: string;
    email: string;
    firstName: string;
    lastName: string;
    /** E.164 only; omit when missing or not valid for Klaviyo. */
    phoneNumber?: string | null;
};

export type KlaviyoNewsletterSubscribeArgs = {
    email: string;
    /** When known, also set as Klaviyo `external_id`. */
    externalId?: string | null;
    locale: Locale;
};

export interface Klaviyo {
    /** Always true when wired from boot-validated env; tests may stub false. */
    isConfigured: () => boolean;
    /** Create-or-update a profile via Klaviyo Profiles API. */
    profileUpsert: (args: KlaviyoProfileUpsertArgs) => Promise<void>;
    /**
     * Subscribe an email to the marketing newsletter list when
     * `KLAVIYO_NEWSLETTER_LIST_ID` is configured; no-op when unset.
     */
    newsletterSubscribe: (args: KlaviyoNewsletterSubscribeArgs) => Promise<void>;
}
