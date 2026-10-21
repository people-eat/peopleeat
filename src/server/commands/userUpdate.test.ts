import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { fileUploads, users } from '../db/schema';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { fileUploadCreate } from './fileUploadCreate';
import { userUpdate } from './userUpdate';

describe('userUpdate', () => {
    it('updates the row and publishes a userUpdates event on success', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'original', lastName: 'User' });

        // Act
        const result = await userUpdate(
            userMutationParent(user.userId),
            { user: { firstName: 'renamed', lastName: 'Person' } },
            requestingSession,
            serverRuntime,
        );

        // Assert — mutation reports success and the row is persisted.
        expect(result).toEqual({ success: true });
        const rows = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.firstName).toBe('Renamed');
        expect(rows[0]!.lastName).toBe('Person');

        // Assert — exactly one publish for this user.
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({ sessionId: requestingSession.sessionId });
    });

    it('updates locale and publishes userUpdates', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ locale: 'de' });

        const result = await userUpdate(userMutationParent(user.userId), { user: { locale: 'en' } }, requestingSession, serverRuntime);

        expect(result).toEqual({ success: true });
        const [row] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(row?.locale).toBe('en');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('updates timeZone and publishes userUpdates', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ timeZone: 'Europe/Berlin' });

        const result = await userUpdate(
            userMutationParent(user.userId),
            { user: { timeZone: 'Europe/Zurich' } },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true });
        const [row] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(row?.timeZone).toBe('Europe/Zurich');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects an empty firstName without writing or publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'original', lastName: 'User' });

        // Act + Assert — guard throws before the DB write.
        await expect(
            userUpdate(userMutationParent(user.userId), { user: { firstName: '' } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/firstName must not be empty/);

        // Assert — row state and the audit log are independent reads, so we
        // run them together. The `findLogsForSession` call drains the logger
        // queue internally before its SELECT.
        const [rows, logRows] = await Promise.all([
            testDb.select().from(users).where(eq(users.userId, user.userId)),
            findLogsForSession(requestingSession.sessionId),
        ]);

        expect(rows[0]!.firstName).toBe('original');
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/firstName must not be empty/);
    });

    it('rejects a whitespace-only lastName', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'original', lastName: 'User' });

        // Act + Assert — `   ` trims to empty; same guard as above.
        await expect(
            userUpdate(userMutationParent(user.userId), { user: { lastName: '   ' } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/lastName must not be empty/);

        const [rows, logRows] = await Promise.all([
            testDb.select().from(users).where(eq(users.userId, user.userId)),
            findLogsForSession(requestingSession.sessionId),
        ]);

        expect(rows[0]!.lastName).toBe('User');
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/lastName must not be empty/);
    });

    it('persists the trimmed names when surrounding whitespace is present', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'original', lastName: 'User' });

        // Act — leading/trailing whitespace should be stripped before the write.
        const result = await userUpdate(
            userMutationParent(user.userId),
            { user: { firstName: '  renamed  ', lastName: '  with spaces  ' } },
            requestingSession,
            serverRuntime,
        );

        // Assert — success + the persisted value is trimmed, collapsed, and titled.
        expect(result).toEqual({ success: true });
        const rows = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(rows[0]!.firstName).toBe('Renamed');
        expect(rows[0]!.lastName).toBe('With spaces');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('throws when the user does not exist and does not publish', async () => {
        // Arrange — plain commandSetup() persists a session with no user attached.
        const { serverRuntime, requestingSession } = await commandSetup();
        const nonExistentUserId = idCreate();

        // Act + Assert — legal-acceptance guard rejects unknown users before the write.
        await expect(
            userUpdate(userMutationParent(nonExistentUserId), { user: { firstName: 'renamed' } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/Unauthorized/);

        const rows = await testDb.select().from(users).where(eq(users.userId, nonExistentUserId));
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects an empty patch', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();

        await expect(userUpdate(userMutationParent(user.userId), { user: {} }, requestingSession, serverRuntime)).rejects.toThrow(
            /at least one field is required/,
        );

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('links an owned image upload as the profile picture', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const upload = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'avatar.jpg',
            mediaType: 'image/jpeg',
            bytes: Buffer.from([1, 2, 3]),
        });

        const result = await userUpdate(
            userMutationParent(user.userId),
            { user: { profilePictureFileUploadId: upload.fileUploadId } },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true });
        const rows = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(rows[0]!.profilePictureFileUploadId).toBe(upload.fileUploadId);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects a profile picture upload owned by someone else', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const upload = await fileUploadCreate(testDb, {
            userId: other.user.userId,
            filename: 'avatar.jpg',
            mediaType: 'image/jpeg',
            bytes: Buffer.from([1, 2, 3]),
        });

        await expect(
            userUpdate(
                userMutationParent(user.userId),
                { user: { profilePictureFileUploadId: upload.fileUploadId } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/file upload not found/);

        const rows = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(rows[0]!.profilePictureFileUploadId).toBeNull();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects a non-image media type for profile pictures', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const upload = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'notes.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF'),
        });

        await expect(
            userUpdate(
                userMutationParent(user.userId),
                { user: { profilePictureFileUploadId: upload.fileUploadId } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/media type is not allowed/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('deletes the previous upload when replacing the profile picture', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const first = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'old.jpg',
            mediaType: 'image/jpeg',
            bytes: Buffer.from([1]),
        });
        await userUpdate(
            userMutationParent(user.userId),
            { user: { profilePictureFileUploadId: first.fileUploadId } },
            requestingSession,
            serverRuntime,
        );
        const second = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'new.jpg',
            mediaType: 'image/jpeg',
            bytes: Buffer.from([2]),
        });

        await userUpdate(
            userMutationParent(user.userId),
            { user: { profilePictureFileUploadId: second.fileUploadId } },
            requestingSession,
            serverRuntime,
        );

        const userRow = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(userRow[0]!.profilePictureFileUploadId).toBe(second.fileUploadId);
        const oldUpload = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, first.fileUploadId));
        expect(oldUpload).toHaveLength(0);
    });

    it('clears the profile picture and deletes the previous upload', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const upload = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'avatar.jpg',
            mediaType: 'image/jpeg',
            bytes: Buffer.from([1, 2, 3]),
        });
        await userUpdate(
            userMutationParent(user.userId),
            { user: { profilePictureFileUploadId: upload.fileUploadId } },
            requestingSession,
            serverRuntime,
        );

        const result = await userUpdate(
            userMutationParent(user.userId),
            { user: { profilePictureFileUploadId: null } },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true });
        const userRow = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(userRow[0]!.profilePictureFileUploadId).toBeNull();
        const gone = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, upload.fileUploadId));
        expect(gone).toHaveLength(0);
    });
});
