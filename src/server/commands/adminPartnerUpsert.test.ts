import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequests, partners, promoCodes } from '../db/schema';
import type { GqlSPartnerUpsert } from '../graphql/generated';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminPartnerUpsert } from './adminPartnerUpsert';

function partnerInput(overrides: Partial<GqlSPartnerUpsert> = {}): GqlSPartnerUpsert {
    const suffix = idCreate().slice(0, 8).toLowerCase();
    return {
        pathName: `partner-${suffix}`,
        name: 'Acme',
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

describe('adminPartnerUpsert', () => {
    it('inserts a new partner and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-create', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const input = partnerInput({
            pathName: `  Partner Brand ${idCreate().slice(0, 8)}  `,
            name: '  Acme Co  ',
            titleDe: '  Titel  ',
            descriptionDe: '  Beschreibung  ',
            headlineDe: '  Headline  ',
            subHeadlineDe: '  Sub  ',
        });

        // Act
        const result = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            { input },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(partners).where(eq(partners.partnerId, result.referenceId!));
        expect(row).toMatchObject({
            name: 'Acme Co',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            previousPathNames: [],
        });
        expect(row?.pathName).toMatch(/^partner-brand-/);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('updates an existing partner and archives the previous pathName', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-update', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const partnerId = idCreate();
        const oldPath = `old-partner-${partnerId.slice(0, 8).toLowerCase()}`;
        const newPath = `new-partner-${partnerId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(partners).values({
            partnerId,
            pathName: oldPath,
            previousPathNames: ['legacy-partner'],
            name: 'Old',
            titleDe: 'Alt',
            descriptionDe: 'Alt',
            headlineDe: 'Alt',
            subHeadlineDe: 'Alt',
            sections: [],
        });

        // Act
        const result = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            { input: partnerInput({ partnerId, pathName: newPath, name: 'Neu' }) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: partnerId });
        const [row] = await testDb.select().from(partners).where(eq(partners.partnerId, partnerId));
        expect(row?.pathName).toBe(newPath);
        expect(row?.name).toBe('Neu');
        expect(row?.previousPathNames).toEqual(expect.arrayContaining(['legacy-partner', oldPath]));
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects empty required fields without writing or publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-empty', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminPartnerUpsert(
                adminMutationParent(admin.user.userId),
                { input: partnerInput({ name: '   ' }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/required fields must not be empty/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/required fields must not be empty/);
    });

    it('rejects an empty pathName without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-empty-path', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminPartnerUpsert(
                adminMutationParent(admin.user.userId),
                { input: partnerInput({ pathName: '   ' }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/pathName must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
    });

    it('rejects an unknown partnerId without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const partnerId = idCreate();

        // Act + Assert
        await expect(
            adminPartnerUpsert(
                adminMutationParent(admin.user.userId),
                { input: partnerInput({ partnerId }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/partner not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/partner not found/);
    });

    it('rejects invalid content sections without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-bad-sections', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminPartnerUpsert(
                adminMutationParent(admin.user.userId),
                {
                    input: partnerInput({
                        sections: [{ sectionId: idCreate(), kind: 'image' }],
                    }),
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Invalid content sections/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/Invalid content sections/);
    });

    it('stores a custom first-section CTA URL and clears it with empty', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-cta', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        const created = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            { input: partnerInput({ firstSectionCtaUrl: ' https://partner.example/book ' }) },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(created.success).toBe(true);
        const [assigned] = await testDb.select().from(partners).where(eq(partners.partnerId, created.referenceId!));
        expect(assigned?.firstSectionCtaUrl).toBe('https://partner.example/book');

        const relative = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: partnerInput({
                    partnerId: created.referenceId!,
                    pathName: assigned!.pathName,
                    firstSectionCtaUrl: '/booking-request/form?redeemCode=ACME',
                }),
            },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(relative.success).toBe(true);
        const [relativeRow] = await testDb.select().from(partners).where(eq(partners.partnerId, created.referenceId!));
        expect(relativeRow?.firstSectionCtaUrl).toBe('/booking-request/form?redeemCode=ACME');

        const cleared = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: partnerInput({
                    partnerId: created.referenceId!,
                    pathName: assigned!.pathName,
                    firstSectionCtaUrl: '   ',
                }),
            },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(cleared.success).toBe(true);
        const [row] = await testDb.select().from(partners).where(eq(partners.partnerId, created.referenceId!));
        expect(row?.firstSectionCtaUrl).toBeNull();
    });

    it('rejects an invalid first-section CTA URL without publishing', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-bad-cta', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminPartnerUpsert(
                adminMutationParent(admin.user.userId),
                { input: partnerInput({ firstSectionCtaUrl: 'javascript:alert(1)' }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/firstSectionCtaUrl must be http\(s\) or a site-relative path/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('assigns a global promo code and clears it with null', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-promo', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode: `PARTNER-${promoCodeId.slice(0, 8)}`,
            amountCents: 5000,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const created = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            { input: partnerInput({ promoCodeId }) },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(created.success).toBe(true);
        const [assigned] = await testDb.select().from(partners).where(eq(partners.partnerId, created.referenceId!));
        expect(assigned?.promoCodeId).toBe(promoCodeId);

        const cleared = await adminPartnerUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: partnerInput({
                    partnerId: created.referenceId!,
                    pathName: assigned!.pathName,
                    promoCodeId: null,
                }),
            },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(cleared.success).toBe(true);
        const [row] = await testDb.select().from(partners).where(eq(partners.partnerId, created.referenceId!));
        expect(row?.promoCodeId).toBeNull();
    });

    it('rejects assigning a booking-request-scoped promo code', async () => {
        const admin = await commandSetup.withUser({ firstName: 'partner-upsert-scoped', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const bookingRequestId = idCreate();
        const user = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: user.user.userId,
            occasion: 'Birthday',
            dateTime: new Date('2030-06-15T18:00:00.000Z'),
            exactEventAddress: {
                displayText: 'Musterstraße 1, 80331 München',
                latitude: 48.137,
                longitude: 11.575,
                addressLine1: 'Musterstraße 1',
                addressLine2: '',
                city: 'München',
                postCode: '80331',
                state: 'BY',
                country: 'DE',
            },
            originalMessage: 'Hello',
            preferences: [],
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        });
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode: `SCOPED-${promoCodeId.slice(0, 8)}`,
            amountCents: 5000,
            bookingRequestId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        await expect(
            adminPartnerUpsert(
                adminMutationParent(admin.user.userId),
                { input: partnerInput({ promoCodeId }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/scoped promo codes cannot be assigned/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});
