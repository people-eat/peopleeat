import type { User } from '../db/schema';
import type { GqlSUser } from '../graphql/generated';

export function toGqlUser(user: User): GqlSUser {
    return {
        userId: user.userId,
        status: user.status,
        emailAddress: user.emailAddress ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber ?? null,
        birthDate: user.birthDate ?? null,
        preferredCommunication: user.preferredCommunication ?? null,
        locale: user.locale,
        timeZone: user.timeZone,
        lastAcceptedPrivacyPolicy: user.lastAcceptedPrivacyPolicy,
        lastAcceptedTerms: user.lastAcceptedTerms,

        // resolved fields
        sessions: [],
        passkeys: [],
        legalAcceptance: null,
        bookingRequests: null,
        assistantChats: null,
        assistantChat: null,
    };
}
