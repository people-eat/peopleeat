import { and, eq } from 'drizzle-orm';

import type { Locale } from '../../shared/locale';
import { phoneNumberAssert } from '../../shared/phoneNumber';
import { textNormalizeTitled } from '../../shared/textNormalize';
import { userBirthDateAssertMinimumAge } from '../../shared/userBirthDate';
import { fileUploads, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { UserPreferredCommunication } from '../domain/user';
import type { GqlSAdminMutation, GqlSAdminMutationUserUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

/**
 * Admin patch of another user's account fields. Profile picture uploads must be
 * owned by the admin (uploader) and are reassigned to the target user.
 */
export async function adminUserUpdate(
    { adminId }: GqlSAdminMutation,
    { userId, user }: GqlSAdminMutationUserUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

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
            throw new Error('adminUserUpdate: at least one field is required');
        }

        const [target] = await serverRuntime.db
            .select({
                userId: users.userId,
                status: users.status,
                profilePictureFileUploadId: users.profilePictureFileUploadId,
            })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!target) {
            throw new Error('adminUserUpdate: user not found');
        }
        if (target.status === 'ANONYMIZED') {
            throw new Error('adminUserUpdate: user is anonymized');
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

        if (hasFirstName) {
            const firstName = textNormalizeTitled(user.firstName!);
            if (firstName.length === 0) {
                throw new Error('adminUserUpdate: firstName must not be empty');
            }
            set.firstName = firstName;
        }

        if (hasLastName) {
            const lastName = textNormalizeTitled(user.lastName!);
            if (lastName.length === 0) {
                throw new Error('adminUserUpdate: lastName must not be empty');
            }
            set.lastName = lastName;
        }

        if (hasPhoneNumber) {
            const phoneNumber = phoneNumberAssert(user.phoneNumber!, 'adminUserUpdate');
            const [existingPhone] = await serverRuntime.db
                .select({ userId: users.userId })
                .from(users)
                .where(and(eq(users.phoneNumber, phoneNumber)))
                .limit(1);
            if (existingPhone && existingPhone.userId !== userId) {
                throw new Error('adminUserUpdate: phoneNumber already registered');
            }
            set.phoneNumber = phoneNumber;
        }

        if (hasBirthDate) {
            userBirthDateAssertMinimumAge(user.birthDate!, 'adminUserUpdate');
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
                throw new Error('adminUserUpdate: timeZone must not be empty');
            }
            set.timeZone = timeZone;
        }

        if (hasProfilePicture) {
            if (user.profilePictureFileUploadId == null) {
                set.profilePictureFileUploadId = null;
            } else {
                await fileUploadAssertOwned(serverRuntime.db, {
                    fileUploadId: user.profilePictureFileUploadId,
                    userId: adminId,
                    allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                    commandName: 'adminUserUpdate',
                });
                set.profilePictureFileUploadId = user.profilePictureFileUploadId;
            }
        }

        const previousProfilePictureFileUploadId = target.profilePictureFileUploadId;

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction.update(users).set(set).where(eq(users.userId, userId)).returning({ userId: users.userId });
            if (updated.length === 0) {
                throw new Error('adminUserUpdate: user not found');
            }

            if (hasProfilePicture && set.profilePictureFileUploadId != null) {
                await transaction
                    .update(fileUploads)
                    .set({ userId })
                    .where(and(eq(fileUploads.fileUploadId, set.profilePictureFileUploadId), eq(fileUploads.userId, adminId)));
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

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
