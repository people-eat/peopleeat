import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, partnerVenues } from '../db/schema';
import type { GqlSPartnerVenueUpsert } from '../graphql/generated';
import { adminMutationParent, commandSetup, partnerOrgInsert, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { adminPartnerVenueUpsert } from './adminPartnerVenueUpsert';

function venueInput(partnerId: string, overrides: Partial<GqlSPartnerVenueUpsert> = {}): GqlSPartnerVenueUpsert {
    const suffix = idCreate().slice(0, 8).toLowerCase();
    return {
        partnerId,
        pathName: `venue-${suffix}`,
        name: 'Loft',
        titleDe: 'Titel',
        titleEn: 'Title',
        descriptionDe: 'Beschreibung',
        descriptionEn: 'Description',
        headlineDe: 'Headline DE',
        headlineEn: 'Headline EN',
        subHeadlineDe: 'Sub DE',
        subHeadlineEn: 'Sub EN',
        firstSectionHeadlineDe: '',
        firstSectionHeadlineEn: '',
        firstSectionBodyDe: '',
        firstSectionBodyEn: '',
        heroImageOverlay: true,
        firstSectionImageOverlay: true,
        howItWorksAlternativeMedia: false,
        featuredCooksShowCity: true,
        sections: [],
        ...overrides,
    };
}

describe('adminPartnerVenueUpsert', () => {
    it('inserts a venue under a partner', async () => {
        const admin = await commandSetup.withUser({ firstName: 'venue-upsert-create', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const partnerId = await partnerOrgInsert('Acme');

        const result = await adminPartnerVenueUpsert(
            adminMutationParent(admin.user.userId),
            { input: venueInput(partnerId, { name: '  Urban Loft  ' }) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(partnerVenues).where(eq(partnerVenues.partnerVenueId, result.referenceId!));
        expect(row).toMatchObject({ name: 'Urban Loft', partnerId });
    });

    it('requires a known partnerId', async () => {
        const admin = await commandSetup.withUser({ firstName: 'venue-upsert-partner', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPartnerVenueUpsert(
                adminMutationParent(admin.user.userId),
                { input: venueInput(idCreate()) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/partner not found/);
    });

    it('moves a venue to another partner', async () => {
        const admin = await commandSetup.withUser({ firstName: 'venue-upsert-move', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const venue = await partnerVenueInsert({ name: 'Loft' });
        const nextPartnerId = await partnerOrgInsert('Other Co');

        const result = await adminPartnerVenueUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: venueInput(nextPartnerId, {
                    partnerVenueId: venue.partnerVenueId,
                    pathName: venue.pathName,
                    name: venue.name,
                }),
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(partnerVenues).where(eq(partnerVenues.partnerVenueId, venue.partnerVenueId));
        expect(row?.partnerId).toBe(nextPartnerId);
    });
});
