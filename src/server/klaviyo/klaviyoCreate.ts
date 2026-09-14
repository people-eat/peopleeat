import { phoneNumberNormalize } from '../../shared/phoneNumber';
import type { Logger } from '../utils/loggerCreate';
import type { Klaviyo, KlaviyoNewsletterSubscribeArgs, KlaviyoProfileUpsertArgs } from './Klaviyo';

export type KlaviyoCreateOptions = {
    privateApiKey: string;
    /** Klaviyo list id for footer newsletter subscribe; omit to skip list API. */
    newsletterListId?: string;
    log: Logger;
};

/** Pin a known Profiles API revision; bump intentionally when adopting newer fields. */
const KLAVIYO_API_REVISION = '2025-01-15';

export function klaviyoPhoneNumberNormalize(phoneNumber: string | null | undefined): string | undefined {
    return phoneNumberNormalize(phoneNumber);
}

export function klaviyoCreate(options: KlaviyoCreateOptions): Klaviyo {
    const privateApiKey = options.privateApiKey.trim();
    const newsletterListId = options.newsletterListId?.trim() || undefined;

    function headers(): HeadersInit {
        return {
            Authorization: `Klaviyo-API-Key ${privateApiKey}`,
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            revision: KLAVIYO_API_REVISION,
        };
    }

    return {
        // Boot requires KLAVIYO_PRIVATE_API_KEY; always true in production wiring.
        // Tests may still stub `isConfigured` on ServerRuntime to false.
        isConfigured: () => true,
        async profileUpsert(args: KlaviyoProfileUpsertArgs): Promise<void> {
            const email = args.email.trim().toLowerCase();
            if (!email) {
                throw new Error('klaviyo.profileUpsert: email is required');
            }

            const phoneNumber = klaviyoPhoneNumberNormalize(args.phoneNumber);
            const attributes: Record<string, string> = {
                email,
                external_id: args.externalId,
                first_name: args.firstName.trim(),
                last_name: args.lastName.trim(),
            };
            if (phoneNumber) {
                attributes.phone_number = phoneNumber;
            }

            const response = await fetch('https://a.klaviyo.com/api/profile-import/', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    data: {
                        type: 'profile',
                        attributes,
                    },
                }),
            });

            if (response.ok) {
                return;
            }

            const body = await response.text();
            throw new Error(`klaviyo.profileUpsert failed (${response.status}): ${body.slice(0, 500)}`);
        },
        async newsletterSubscribe(args: KlaviyoNewsletterSubscribeArgs): Promise<void> {
            if (!newsletterListId) {
                return;
            }

            const email = args.email.trim().toLowerCase();
            if (!email) {
                throw new Error('klaviyo.newsletterSubscribe: email is required');
            }

            const profileAttributes: Record<string, string> = {
                email,
                locale: args.locale,
            };
            if (args.externalId) {
                profileAttributes.external_id = args.externalId;
            }

            const response = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    data: {
                        type: 'profile-subscription-bulk-create-job',
                        attributes: {
                            profiles: {
                                data: [
                                    {
                                        type: 'profile',
                                        attributes: {
                                            ...profileAttributes,
                                            subscriptions: {
                                                email: {
                                                    marketing: {
                                                        consent: 'SUBSCRIBED',
                                                    },
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                        relationships: {
                            list: {
                                data: {
                                    type: 'list',
                                    id: newsletterListId,
                                },
                            },
                        },
                    },
                }),
            });

            if (response.ok || response.status === 202) {
                return;
            }

            const body = await response.text();
            throw new Error(`klaviyo.newsletterSubscribe failed (${response.status}): ${body.slice(0, 500)}`);
        },
    };
}
