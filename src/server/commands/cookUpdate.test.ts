import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { cooks, fileUploads } from '../db/schema';
import type { CookCreate } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookUpdate } from './cookUpdate';
import { fileUploadCreate } from './fileUploadCreate';

async function setupCook(overrides: Partial<CookCreate> = {}) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    return setup;
}

const berlinSuggestion = {
    displayText: 'Unter den Linden 1, 10117 Berlin, Germany',
    latitude: 52.517,
    longitude: 13.388,
    structuredAddress: {
        addressLine1: 'Unter den Linden 1',
        addressLine2: '',
        city: 'Berlin',
        postCode: '10117',
        state: 'BE',
        country: 'DE',
    },
};

describe('cookUpdate', () => {
    it('updates profile fields and publishes userUpdates + adminUpdates', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act
        const result = await cookUpdate(
            cookMutationParent(user.userId),
            {
                input: {
                    isVisible: true,
                    biography: 'I cook with love',
                    cuisineStyle: 'Italienisch',
                    cookingPhilosophy: 'Saisonal',
                    travelExpensesAmount: 40,
                    maximumTravelDistance: 50,
                    minimumPriceAmount: 100,
                    maximumPriceAmount: 500,
                    minimumParticipants: 2,
                    maximumParticipants: 12,
                    callSchedulingEnabled: true,
                    callDurationMinutes: 45,
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.isVisible).toBe(true);
        expect(row!.biography).toBe('I cook with love');
        expect(row!.cuisineStyle).toBe('Italienisch');
        expect(row!.cookingPhilosophy).toBe('Saisonal');
        expect(row!.travelExpensesAmount).toBe(40);
        expect(row!.maximumTravelDistance).toBe(50);
        expect(row!.minimumPriceAmount).toBe(100);
        expect(row!.maximumPriceAmount).toBe(500);
        expect(row!.minimumParticipants).toBe(2);
        expect(row!.maximumParticipants).toBe(12);
        expect(row!.callSchedulingEnabled).toBe(true);
        expect(row!.callDurationMinutes).toBe(45);
        expect(serverRuntime.jobs.findByData).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'cook-biography-summary-generate' }),
            { cookId: user.userId },
            { queued: false },
        );
        expect(serverRuntime.jobs.enqueue).toHaveBeenCalledWith(expect.objectContaining({ name: 'cook-biography-summary-generate' }), {
            cookId: user.userId,
        });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('clears biographySummary and cancels the summary job when biography is emptied', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook({
            biography: 'Old bio',
            biographySummary: 'Old summary',
        });

        await cookUpdate(cookMutationParent(user.userId), { input: { biography: '   ' } }, requestingSession, serverRuntime);

        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.biography).toBe('   ');
        expect(row!.biographySummary).toBe('');
        expect(serverRuntime.jobs.findByData).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'cook-biography-summary-generate' }),
            { cookId: user.userId },
            { queued: false },
        );
        expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    });

    it('does not enqueue a summary job when biography is unchanged in the patch', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        await cookUpdate(cookMutationParent(user.userId), { input: { isVisible: true } }, requestingSession, serverRuntime);

        expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('resolves exactTravelOriginAddress via places.locationSuggestions', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        vi.mocked(serverRuntime.places.locationSuggestions).mockResolvedValue([berlinSuggestion]);

        // Act
        const result = await cookUpdate(
            cookMutationParent(user.userId),
            { input: { exactTravelOriginAddress: '  Unter den Linden 1 Berlin  ' } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: user.userId });
        expect(serverRuntime.places.locationSuggestions).toHaveBeenCalledWith({
            searchText: 'Unter den Linden 1 Berlin',
            sessionToken: requestingSession.sessionId,
            onlyFullAddresses: true,
        });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.exactTravelOriginAddress).toEqual({
            displayText: berlinSuggestion.displayText,
            latitude: berlinSuggestion.latitude,
            longitude: berlinSuggestion.longitude,
            ...berlinSuggestion.structuredAddress,
        });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('clears cuisineStyle and cookingPhilosophy when set to empty/null', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            cuisineStyle: 'Italienisch',
            cookingPhilosophy: 'Saisonal',
        });

        // Act
        await cookUpdate(
            cookMutationParent(user.userId),
            { input: { cuisineStyle: '  ', cookingPhilosophy: null } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.cuisineStyle).toBeNull();
        expect(row!.cookingPhilosophy).toBeNull();
    });

    it('rejects an empty patch without publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act + Assert — validation throws before try/catch, so no error log.
        await expect(cookUpdate(cookMutationParent(user.userId), { input: {} }, requestingSession, serverRuntime)).rejects.toThrow(
            /at least one field is required/,
        );

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects invalid callDurationMinutes', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act + Assert
        await expect(
            cookUpdate(cookMutationParent(user.userId), { input: { callDurationMinutes: 20 } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/callDurationMinutes is invalid/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects travelExpensesAmount below the minimum', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act + Assert
        await expect(
            cookUpdate(cookMutationParent(user.userId), { input: { travelExpensesAmount: 10 } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/travelExpensesAmount is below minimum/);
    });

    it('rejects maximumTravelDistance out of range', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act + Assert
        await expect(
            cookUpdate(cookMutationParent(user.userId), { input: { maximumTravelDistance: 3 } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/maximumTravelDistance is out of range/);

        await expect(
            cookUpdate(cookMutationParent(user.userId), { input: { maximumTravelDistance: 300 } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/maximumTravelDistance is out of range/);
    });

    it('rejects invalid cuisineStyle and cookingPhilosophy', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act + Assert
        await expect(
            cookUpdate(cookMutationParent(user.userId), { input: { cuisineStyle: 'Not A Style' } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/cuisineStyle is invalid/);

        await expect(
            cookUpdate(
                cookMutationParent(user.userId),
                { input: { cookingPhilosophy: 'Not A Philosophy' } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/cookingPhilosophy is invalid/);
    });

    it('rejects an empty exactTravelOriginAddress', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act + Assert
        await expect(
            cookUpdate(cookMutationParent(user.userId), { input: { exactTravelOriginAddress: '   ' } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/exactTravelOriginAddress must not be empty/);

        expect(serverRuntime.places.locationSuggestions).not.toHaveBeenCalled();
    });

    it('rejects a places suggestion without a structured full address', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        vi.mocked(serverRuntime.places.locationSuggestions).mockResolvedValue([
            { displayText: 'Berlin', latitude: 52.52, longitude: 13.4 },
        ]);

        // Act + Assert
        await expect(
            cookUpdate(
                cookMutationParent(user.userId),
                { input: { exactTravelOriginAddress: 'Berlin' } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/must be a full address/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects when the cook row is missing and logs inside the write path', async () => {
        // Arrange — user without cooks row; validation passes, update returns nothing.
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'missing-cook', lastName: 'User' });

        // Act + Assert
        await expect(
            cookUpdate(cookMutationParent(user.userId), { input: { biography: 'Hello' } }, requestingSession, serverRuntime),
        ).rejects.toThrow(/cook not found/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /cook not found/.test(row.message))).toBe(true);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('links a logo upload and replaces the previous one', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const first = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'logo-1.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from([1, 2, 3]),
        });
        const second = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'logo-2.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from([4, 5, 6]),
        });

        await cookUpdate(
            cookMutationParent(user.userId),
            { input: { logoFileUploadId: first.fileUploadId } },
            requestingSession,
            serverRuntime,
        );
        await cookUpdate(
            cookMutationParent(user.userId),
            { input: { logoFileUploadId: second.fileUploadId } },
            requestingSession,
            serverRuntime,
        );

        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.logoFileUploadId).toBe(second.fileUploadId);
        const oldUpload = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, first.fileUploadId));
        expect(oldUpload).toHaveLength(0);
    });

    it('clears the logo and deletes the previous upload', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const upload = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'logo.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from([1, 2, 3]),
        });
        await cookUpdate(
            cookMutationParent(user.userId),
            { input: { logoFileUploadId: upload.fileUploadId } },
            requestingSession,
            serverRuntime,
        );

        const result = await cookUpdate(
            cookMutationParent(user.userId),
            { input: { logoFileUploadId: null } },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.logoFileUploadId).toBeNull();
        const gone = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, upload.fileUploadId));
        expect(gone).toHaveLength(0);
    });
});
