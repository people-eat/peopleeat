import type { User } from '../db/schema';
import type { GqlSFileUpload, GqlSPublicUser } from '../graphql/generated';

export function toGqlPublicUser(user: Pick<User, 'firstName' | 'createdAt'>, profilePicture: GqlSFileUpload | null = null): GqlSPublicUser {
    return {
        display: user.firstName,
        createdAt: user.createdAt,
        profilePicture,
    };
}
