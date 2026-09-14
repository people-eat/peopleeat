import type { ServerRuntime } from '../domain/ServerRuntime';
import { toGqlPublicLegalImprint } from '../mappers/toGqlPublicLegalImprint';
import { toGqlPublicLegalPrivacyPolicy } from '../mappers/toGqlPublicLegalPrivacyPolicy';
import { toGqlPublicLegalTermsAndConditions } from '../mappers/toGqlPublicLegalTermsAndConditions';
import { legalImprintPublishedFindLatest } from '../utils/legalImprintPublishedFindLatest';
import { legalPrivacyPolicyPublishedFindLatest } from '../utils/legalPrivacyPolicyPublishedFindLatest';
import { legalTermsAndConditionsPublishedFindLatest } from '../utils/legalTermsAndConditionsPublishedFindLatest';

export async function publicLegalFind(serverRuntime: ServerRuntime) {
    const [privacy, terms, imprint] = await Promise.all([
        legalPrivacyPolicyPublishedFindLatest(serverRuntime),
        legalTermsAndConditionsPublishedFindLatest(serverRuntime),
        legalImprintPublishedFindLatest(serverRuntime),
    ]);
    return {
        privacyPolicy: privacy ? toGqlPublicLegalPrivacyPolicy(privacy) : null,
        termsAndConditions: terms ? toGqlPublicLegalTermsAndConditions(terms) : null,
        imprint: imprint ? toGqlPublicLegalImprint(imprint) : null,
    };
}
