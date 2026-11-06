import type { User } from '../db/schema';
import { notificationSettingsResolve } from '../domain/notificationSettings';
import type { GqlSAdminUser, GqlSAdminUserType } from '../graphql/generated';

export function toGqlAdminUser(user: User, types: GqlSAdminUserType[]): GqlSAdminUser {
    return {
        userId: user.userId,
        emailAddress: user.emailAddress ?? null,
        previousEmailAddresses: user.previousEmailAddresses,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        phoneNumber: user.phoneNumber ?? null,
        birthDate: user.birthDate ?? null,
        preferredCommunication: user.preferredCommunication ?? null,
        notificationSettings: notificationSettingsResolve(user.notificationSettings),
        locale: user.locale,
        timeZone: user.timeZone,
        adminNote: user.adminNote,
        types,
        createdAt: user.createdAt,

        // resolved fields
        passkeys: [],
        timeBasedOneTimePassword: null,
        oauthIdentities: [],
        profilePicture: null,
        cook: null,
        featureToggleOverrides: [],
    };
}
