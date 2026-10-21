import { and, eq } from 'drizzle-orm';

import type { Locale } from '../../shared/locale';
import { phoneNumberAssert } from '../../shared/phoneNumber';
import { textNormalizeTitled } from '../../shared/textNormalize';
import { userBirthDateAssertMinimumAge } from '../../shared/userBirthDate';
import { fileUploads, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { UserPreferredCommunication } from '../domain/user';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationUserUpdateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

export async function userUpdate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationUserUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    const { user } = args;
    try {
        const hasFirstName = user.firstName !== undefined && user.firstName !== null;
        const hasLastName = user.lastName !== undefined && user.lastName !== null;
        const hasPhoneNumber = user.phoneNumber !== undefined && user.phoneNumber !== null;
        const hasBirthDate = user.birthDate !== undefined && user.birthDate !== null;
        const hasPreferredCommunication = user.preferredCommunication !== undefined && user.preferredCommunication !== null;
        const hasLocale = user.locale !== undefined && user.locale !== null;
        const hasTimeZone = user.timeZone !== undefined && user.timeZone !== null;
        const hasProfilePicture = user.profilePictureFileUploadId !== undefined;
        if (
            !hasFirstName &&
            !hasLastName &&
            !hasPhoneNumber &&
            !hasBirthDate &&
            !hasPreferredCommunication &&
            !hasLocale &&
            !hasTimeZone &&
            !hasProfilePicture
        ) {
            throw new Error('userUpdate: at least one field is required');
        }

        const set: {
            firstName?: string;
            lastName?: string;
            phoneNumber?: string;
            birthDate?: string;
            preferredCommunication?: UserPreferredCommunication;
            locale?: Locale;
            timeZone?: string;
            profilePictureFileUploadId?: string | null;
        } = {};
        let previousProfilePictureFileUploadId: string | null | undefined;

        if (hasFirstName) {
            const firstName = textNormalizeTitled(user.firstName!);
            if (firstName.length === 0) {
                throw new Error('userUpdate: firstName must not be empty');
            }
            set.firstName = firstName;
        }

        if (hasLastName) {
            const lastName = textNormalizeTitled(user.lastName!);
            if (lastName.length === 0) {
                throw new Error('userUpdate: lastName must not be empty');
            }
            set.lastName = lastName;
        }

        if (hasPhoneNumber) {
            const phoneNumber = phoneNumberAssert(user.phoneNumber!, 'userUpdate');
            const [existingPhone] = await serverRuntime.db
                .select({ userId: users.userId })
                .from(users)
                .where(and(eq(users.phoneNumber, phoneNumber)))
                .limit(1);
            if (existingPhone && existingPhone.userId !== userId) {
                throw new Error('userUpdate: phoneNumber already registered');
            }
            set.phoneNumber = phoneNumber;
        }

        if (hasBirthDate) {
            userBirthDateAssertMinimumAge(user.birthDate!, 'userUpdate');
            set.birthDate = user.birthDate!;
        }

        if (hasPreferredCommunication) {
            set.preferredCommunication = user.preferredCommunication as UserPreferredCommunication;
        }

        if (hasLocale) {
            set.locale = user.locale as Locale;
        }

        if (hasTimeZone) {
            const timeZone = user.timeZone!.trim();
            if (timeZone.length === 0) {
                throw new Error('userUpdate: timeZone must not be empty');
            }
            set.timeZone = timeZone;
        }

        if (hasProfilePicture) {
            const [current] = await serverRuntime.db
                .select({ profilePictureFileUploadId: users.profilePictureFileUploadId })
                .from(users)
                .where(eq(users.userId, userId))
                .limit(1);
            if (!current) {
                throw new Error('userUpdate: user not found');
            }
            previousProfilePictureFileUploadId = current.profilePictureFileUploadId;

            if (user.profilePictureFileUploadId == null) {
                set.profilePictureFileUploadId = null;
            } else {
                await fileUploadAssertOwned(serverRuntime.db, {
                    fileUploadId: user.profilePictureFileUploadId,
                    userId,
                    allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                    commandName: 'userUpdate',
                });
                set.profilePictureFileUploadId = user.profilePictureFileUploadId;
            }
        }

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction.update(users).set(set).where(eq(users.userId, userId)).returning({ userId: users.userId });

            if (updated.length === 0) {
                throw new Error('userUpdate: user not found');
            }

            if (hasProfilePicture && previousProfilePictureFileUploadId != null) {
                const nextId = set.profilePictureFileUploadId ?? null;
                if (nextId !== previousProfilePictureFileUploadId) {
                    await transaction
                        .delete(fileUploads)
                        .where(and(eq(fileUploads.fileUploadId, previousProfilePictureFileUploadId), eq(fileUploads.userId, userId)));
                }
            }
        });

        await serverRuntime.publish.userUpdates({ userId });
        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });

        return {
            success: true,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
