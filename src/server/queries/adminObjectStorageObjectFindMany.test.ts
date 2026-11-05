import { describe, expect, it, vi } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { adminObjectStorageObjectFindMany } from './adminObjectStorageObjectFindMany';

describe('adminObjectStorageObjectFindMany', () => {
    it('returns an unconfigured page without listing objects', async () => {
        // Arrange
        const setup = await commandSetup();
        vi.mocked(setup.serverRuntime.objectStorage.isConfigured).mockReturnValue(false);

        // Act
        const page = await adminObjectStorageObjectFindMany(
            { criterion: { prefix: 'recordings/' } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(page).toEqual({
            configured: false,
            bucket: null,
            objects: [],
            nextContinuationToken: null,
            isTruncated: false,
        });
        expect(setup.serverRuntime.objectStorage.listObjects).not.toHaveBeenCalled();
    });

    it('maps a listed page and forwards prefix, token, and take', async () => {
        // Arrange
        const setup = await commandSetup();
        const lastModified = new Date('2030-01-02T00:00:00.000Z');
        vi.mocked(setup.serverRuntime.objectStorage.isConfigured).mockReturnValue(true);
        vi.mocked(setup.serverRuntime.objectStorage.listObjects).mockResolvedValue({
            bucket: 'peopleeat-test',
            objects: [
                { key: 'recordings/a.ogg', size: 12, lastModified, etag: '"abc"' },
                { key: 'recordings/b.ogg', size: 0, lastModified: undefined, etag: undefined },
            ],
            nextContinuationToken: 'next-page',
            isTruncated: true,
        });

        // Act
        const page = await adminObjectStorageObjectFindMany(
            { criterion: { prefix: '  recordings/  ', continuationToken: '  tok  ', take: 7 } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(setup.serverRuntime.objectStorage.listObjects).toHaveBeenCalledWith({
            prefix: 'recordings/',
            continuationToken: 'tok',
            maxKeys: 7,
        });
        expect(page).toEqual({
            configured: true,
            bucket: 'peopleeat-test',
            objects: [
                { key: 'recordings/a.ogg', size: 12, lastModified, etag: '"abc"' },
                { key: 'recordings/b.ogg', size: 0, lastModified: null, etag: null },
            ],
            nextContinuationToken: 'next-page',
            isTruncated: true,
        });
    });

    it('treats a blank prefix and continuation token as unset', async () => {
        // Arrange
        const setup = await commandSetup();
        vi.mocked(setup.serverRuntime.objectStorage.isConfigured).mockReturnValue(true);
        vi.mocked(setup.serverRuntime.objectStorage.listObjects).mockResolvedValue({
            bucket: 'peopleeat-test',
            objects: [],
            nextContinuationToken: undefined,
            isTruncated: false,
        });

        // Act
        const page = await adminObjectStorageObjectFindMany(
            { criterion: { prefix: '   ', continuationToken: '  ', take: null } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(setup.serverRuntime.objectStorage.listObjects).toHaveBeenCalledWith({
            prefix: undefined,
            continuationToken: undefined,
            maxKeys: 25,
        });
        expect(page).toMatchObject({
            configured: true,
            bucket: 'peopleeat-test',
            objects: [],
            nextContinuationToken: null,
            isTruncated: false,
        });
    });

    it('rethrows when listing objects fails', async () => {
        // Arrange
        const setup = await commandSetup();
        vi.mocked(setup.serverRuntime.objectStorage.isConfigured).mockReturnValue(true);
        vi.mocked(setup.serverRuntime.objectStorage.listObjects).mockRejectedValue(new Error('s3 down'));

        // Act / Assert
        await expect(
            adminObjectStorageObjectFindMany({ criterion: { prefix: 'recordings/' } }, setup.requestingSession, setup.serverRuntime),
        ).rejects.toThrow('s3 down');
    });
});
