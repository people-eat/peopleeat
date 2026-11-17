import type { User } from '../db/schema';
import type { GqlSFileUpload, GqlSPublicUser } from '../graphql/generated';

export function toGqlPublicUser(
    user: Pick<User, 'firstName' | 'createdAt' | 'status'>,
    profilePicture: GqlSFileUpload | null = null,
    deletedAccountLabel = 'Deleted account',
): GqlSPublicUser {
    return {
        display: user.status === 'ANONYMIZED' ? deletedAccountLabel : user.firstName,
        status: user.status,
        createdAt: user.createdAt,
        profilePicture,
    };
}
