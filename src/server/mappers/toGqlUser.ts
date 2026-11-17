import type { User } from '../db/schema';
import { notificationSettingsResolve } from '../domain/notificationSettings';
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
        notificationSettings: notificationSettingsResolve(user.notificationSettings),
        locale: user.locale,
        timeZone: user.timeZone,
        createdAt: user.createdAt,
        accountDeletionScheduledFor: user.accountDeletionScheduledFor ?? null,
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
