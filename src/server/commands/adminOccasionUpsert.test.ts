import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { occasionFormatsSectionEmpty } from '../../shared/occasionFormatsSection';
import { admins, bookingRequests, occasions, promoCodes } from '../db/schema';
import type { GqlSOccasionUpsert } from '../graphql/generated';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminOccasionUpsert } from './adminOccasionUpsert';

function occasionInput(overrides: Partial<GqlSOccasionUpsert> = {}): GqlSOccasionUpsert {
    const suffix = idCreate().slice(0, 8).toLowerCase();
    return {
        pathName: `occasion-${suffix}`,
        name: 'Geburtstag',
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
        formatsSection: occasionFormatsSectionEmpty(),
        sections: [],
        ...overrides,
    };
}

describe('adminOccasionUpsert', () => {
    it('inserts a new occasion and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-create', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const input = occasionInput({
            pathName: `  Occasion Birthday ${idCreate().slice(0, 8)}  `,
            name: '  Geburtstag  ',
            titleDe: '  Titel  ',
            descriptionDe: '  Beschreibung  ',
            headlineDe: '  Headline  ',
            subHeadlineDe: '  Sub  ',
        });

        // Act
        const result = await adminOccasionUpsert(
            adminMutationParent(admin.user.userId),
            { input },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(occasions).where(eq(occasions.occasionId, result.referenceId!));
        expect(row).toMatchObject({
            name: 'Geburtstag',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            previousPathNames: [],
        });
        expect(row?.pathName).toMatch(/^occasion-birthday-/);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('updates an existing occasion and archives the previous pathName', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-update', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const occasionId = idCreate();
        const oldPath = `old-occasion-${occasionId.slice(0, 8).toLowerCase()}`;
        const newPath = `new-occasion-${occasionId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(occasions).values({
            occasionId,
            pathName: oldPath,
            previousPathNames: ['legacy-occasion'],
            name: 'Alt',
            titleDe: 'Alt',
            descriptionDe: 'Alt',
            headlineDe: 'Alt',
            subHeadlineDe: 'Alt',
            sections: [],
        });

        // Act
        const result = await adminOccasionUpsert(
            adminMutationParent(admin.user.userId),
            { input: occasionInput({ occasionId, pathName: newPath, name: 'Neu' }) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: occasionId });
        const [row] = await testDb.select().from(occasions).where(eq(occasions.occasionId, occasionId));
        expect(row?.pathName).toBe(newPath);
        expect(row?.name).toBe('Neu');
        expect(row?.previousPathNames).toEqual(expect.arrayContaining(['legacy-occasion', oldPath]));
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects empty required fields without writing or publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-empty', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminOccasionUpsert(
                adminMutationParent(admin.user.userId),
                { input: occasionInput({ name: '   ' }) },
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
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-empty-path', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminOccasionUpsert(
                adminMutationParent(admin.user.userId),
                { input: occasionInput({ pathName: '   ' }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/pathName must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
    });

    it('rejects an unknown occasionId without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const occasionId = idCreate();

        // Act + Assert
        await expect(
            adminOccasionUpsert(
                adminMutationParent(admin.user.userId),
                { input: occasionInput({ occasionId }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/occasion not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/occasion not found/);
    });

    it('rejects invalid content sections without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-bad-sections', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminOccasionUpsert(
                adminMutationParent(admin.user.userId),
                {
                    input: occasionInput({
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

    it('persists a filled formats section', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-formats', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const formatsSection = occasionFormatsSectionEmpty();
        formatsSection.titleDe = 'Drei Formate';
        formatsSection.subtitleDe = 'Beliebte Varianten';
        formatsSection.cards[0].titleDe = 'Seated Dinner';
        formatsSection.cards[0].bodyDe = 'Am Tisch.';
        formatsSection.cards[0].fact1De = '6–14 Personen';
        formatsSection.cards[0].fact2De = '3–5 Gänge';
        formatsSection.cards[0].fact3De = 'am Tisch serviert';

        // Act
        const result = await adminOccasionUpsert(
            adminMutationParent(admin.user.userId),
            { input: occasionInput({ formatsSection }) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(occasions).where(eq(occasions.occasionId, result.referenceId!));
        expect(row?.formatsSection.titleDe).toBe('Drei Formate');
        expect(row?.formatsSection.cards[0]!.titleDe).toBe('Seated Dinner');
        expect(row?.formatsSection.cards[0]!.fact1De).toBe('6–14 Personen');
        expect(row?.formatsSection.cards).toHaveLength(3);
    });

    it('rejects a formats section with fewer than three cards', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-bad-formats', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const invalidFormats = {
            ...occasionFormatsSectionEmpty(),
            cards: [occasionFormatsSectionEmpty().cards[0]],
        } as unknown as GqlSOccasionUpsert['formatsSection'];

        // Act + Assert
        await expect(
            adminOccasionUpsert(
                adminMutationParent(admin.user.userId),
                { input: occasionInput({ formatsSection: invalidFormats }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Invalid occasion formats section/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('assigns a global promo code and clears it with null', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-promo', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode: `OCCASION-${promoCodeId.slice(0, 8)}`,
            amountCents: 5000,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        // Act
        const created = await adminOccasionUpsert(
            adminMutationParent(admin.user.userId),
            { input: occasionInput({ promoCodeId }) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(created.success).toBe(true);
        const [assigned] = await testDb.select().from(occasions).where(eq(occasions.occasionId, created.referenceId!));
        expect(assigned?.promoCodeId).toBe(promoCodeId);

        const cleared = await adminOccasionUpsert(
            adminMutationParent(admin.user.userId),
            {
                input: occasionInput({
                    occasionId: created.referenceId!,
                    pathName: assigned!.pathName,
                    promoCodeId: null,
                }),
            },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(cleared.success).toBe(true);
        const [row] = await testDb.select().from(occasions).where(eq(occasions.occasionId, created.referenceId!));
        expect(row?.promoCodeId).toBeNull();
    });

    it('rejects assigning a booking-request-scoped promo code', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'occasion-upsert-scoped', lastName: 'User' });
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

        // Act + Assert
        await expect(
            adminOccasionUpsert(
                adminMutationParent(admin.user.userId),
                { input: occasionInput({ promoCodeId }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/scoped promo codes cannot be assigned/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});
