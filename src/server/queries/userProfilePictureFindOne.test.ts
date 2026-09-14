import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { fileUploads, users } from '../db/schema';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';
import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userProfilePictureFindOne } from './userProfilePictureFindOne';

describe('userProfilePictureFindOne', () => {
    it('returns the mapped file upload when the user has a profile picture', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser();
        const [upload] = await testDb
            .insert(fileUploads)
            .values({
                fileUploadId: idCreate(),
                userId: user.userId,
                filename: 'avatar.jpg',
                mediaType: 'image/jpeg',
                size: 3,
                bytes: Buffer.from([1, 2, 3]),
            })
            .returning();
        if (!upload) throw new Error('insert avatar upload: no row');
        await testDb.update(users).set({ profilePictureFileUploadId: upload.fileUploadId }).where(eq(users.userId, user.userId));

        // Act
        const result = await userProfilePictureFindOne(toGqlUser(user), serverRuntime);

        // Assert
        expect(result).toEqual(toGqlFileUpload(upload));
    });

    it('returns null when the user has no profile picture', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser();

        // Act / Assert
        await expect(userProfilePictureFindOne(toGqlUser(user), serverRuntime)).resolves.toBeNull();
    });
});
