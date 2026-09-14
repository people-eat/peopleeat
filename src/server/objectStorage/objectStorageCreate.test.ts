import { beforeEach, describe, expect, it, vi } from 'vitest';

import { objectStorageCreate } from './objectStorageCreate';

describe('objectStorageCreate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('isConfigured is true when wired with boot-required credentials', () => {
        const storage = objectStorageCreate({
            bucket: 'bucket',
            endpoint: 'https://garage.example.com',
            region: 'garage',
            accessKeyId: 'key',
            secretAccessKey: 'secret',
            forcePathStyle: true,
        });
        expect(storage.isConfigured()).toBe(true);
        expect(storage.s3Credentials()).toEqual({
            accessKey: 'key',
            secret: 'secret',
            region: 'garage',
            endpoint: 'https://garage.example.com',
            bucket: 'bucket',
            forcePathStyle: true,
        });
    });
});
