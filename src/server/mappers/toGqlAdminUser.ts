import type { User } from '../db/schema';
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
        locale: user.locale,
        timeZone: user.timeZone,
        adminNote: user.adminNote,
        types,
        createdAt: user.createdAt,

        // resolved fields
        profilePicture: null,
        cook: null,
        featureToggleOverrides: [],
    };
}
