import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { commandSetup, partnerOrgInsert, partnerVenueInsert } from '../test/commandTestUtils';
import { adminPartnerFindMany } from './adminPartnerFindMany';
import { adminPartnerFindOne } from './adminPartnerFindOne';

describe('adminPartnerFindMany', () => {
    it('returns partners with nested venues ordered by updatedAt descending', async () => {
        const { serverRuntime } = await commandSetup();
        const olderId = await partnerOrgInsert('older-partner');
        await partnerVenueInsert({
            partnerId: olderId,
            name: 'Older venue',
            updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        });
        const newerId = await partnerOrgInsert('newer-partner');
        await partnerVenueInsert({
            partnerId: newerId,
            name: 'Newer venue',
            updatedAt: new Date('2024-06-01T00:00:00.000Z'),
        });

        const rows = await adminPartnerFindMany(serverRuntime);

        const olderIdx = rows.findIndex((row) => row.partnerId === olderId);
        const newerIdx = rows.findIndex((row) => row.partnerId === newerId);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(rows[newerIdx]).toMatchObject({ partnerId: newerId, name: 'newer-partner' });
        expect(rows[newerIdx]?.venues[0]?.name).toBe('Newer venue');
    });
});

describe('adminPartnerFindOne', () => {
    it('returns the mapped partner row with venues', async () => {
        const { serverRuntime } = await commandSetup();
        const partnerId = await partnerOrgInsert('detail-partner');
        const venue = await partnerVenueInsert({ partnerId, name: 'Detail venue' });

        const row = await adminPartnerFindOne({ partnerId }, serverRuntime);

        expect(row).toMatchObject({
            partnerId,
            name: 'detail-partner',
        });
        expect(row?.venues).toEqual([expect.objectContaining({ partnerVenueId: venue.partnerVenueId, name: 'Detail venue' })]);
    });

    it('returns null when the partner id is unknown', async () => {
        const { serverRuntime } = await commandSetup();
        await expect(adminPartnerFindOne({ partnerId: idCreate() }, serverRuntime)).resolves.toBeNull();
    });
});
