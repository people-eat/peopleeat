import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { commandSetup, partnerVenueInsert } from '../test/commandTestUtils';
import { publicPartnerVenueFindMany } from './publicPartnerVenueFindMany';
import { publicPartnerVenueFindOneByPathName } from './publicPartnerVenueFindOneByPathName';

describe('publicPartnerVenueFindMany', () => {
    it('includes published venues, excludes unpublished ones, and omits partner fields', async () => {
        const { serverRuntime } = await commandSetup();
        const published = await partnerVenueInsert({
            name: 'published-venue',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });
        const unpublished = await partnerVenueInsert({ name: 'draft-venue', publishedAt: null });

        const rows = await publicPartnerVenueFindMany(serverRuntime);

        const publishedRow = rows.find((row) => row.partnerVenueId === published.partnerVenueId);
        expect(publishedRow).toBeDefined();
        expect(publishedRow).not.toHaveProperty('partnerId');
        expect(publishedRow).not.toHaveProperty('partner');
        expect(rows.some((row) => row.partnerVenueId === unpublished.partnerVenueId)).toBe(false);
    });
});

describe('publicPartnerVenueFindOneByPathName', () => {
    it('returns the published venue by its current path name', async () => {
        const { serverRuntime } = await commandSetup();
        const pathName = `published-venue-${idCreate()}`;
        const venue = await partnerVenueInsert({
            pathName,
            name: 'published-venue',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        const row = await publicPartnerVenueFindOneByPathName({ pathName }, serverRuntime);

        expect(row).toMatchObject({ partnerVenueId: venue.partnerVenueId, pathName });
        expect(row).not.toHaveProperty('partnerId');
    });

    it('returns null for an unpublished venue path name', async () => {
        const { serverRuntime } = await commandSetup();
        const pathName = `draft-venue-${idCreate()}`;
        await partnerVenueInsert({ pathName, name: 'draft-venue', publishedAt: null });

        await expect(publicPartnerVenueFindOneByPathName({ pathName }, serverRuntime)).resolves.toBeNull();
    });
});
