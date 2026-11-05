import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    adminLegalPrivacyPolicies,
    admins,
    cities,
    cityTestimonials,
    cooks,
    cookTestimonials,
    customerTestimonials,
    occasions,
    occasionTestimonials,
    partners,
    partnerTestimonials,
} from '../db/schema';
import type { GqlSTestimonialJunctionEntryInput } from '../graphql/generated';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCityTestimonialsUpdate } from './adminCityTestimonialsUpdate';
import { adminOccasionTestimonialsUpdate } from './adminOccasionTestimonialsUpdate';
import { adminPartnerTestimonialsUpdate } from './adminPartnerTestimonialsUpdate';

const pages = ['city', 'occasion', 'partner'] as const;
type PageKind = (typeof pages)[number];

const commandName: Record<PageKind, string> = {
    city: 'adminCityTestimonialsUpdate',
    occasion: 'adminOccasionTestimonialsUpdate',
    partner: 'adminPartnerTestimonialsUpdate',
};

async function adminSetup(firstName: string, staleAcceptance = false) {
    const admin = await commandSetup.withUser({
        firstName,
        lastName: 'Admin',
        ...(staleAcceptance ? { lastAcceptedPrivacyPolicy: null, lastAcceptedTerms: null } : {}),
    });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    if (staleAcceptance) {
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId: idCreate(),
            bodyDe: 'Privacy',
            changeSummaryDe: 'Published',
            publishedAt: new Date('2000-01-01T00:00:00.000Z'),
        });
    }
    return admin;
}

async function seedQuotes() {
    const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Quote' });
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Quote' });
    await testDb.insert(cooks).values({ cookId: cook.user.userId });
    const customerTestimonialId = idCreate();
    const cookTestimonialId = idCreate();
    const extraCustomerTestimonialId = idCreate();
    await testDb.insert(customerTestimonials).values([
        {
            customerTestimonialId,
            userId: customer.user.userId,
            body: 'Customer quote',
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date(),
        },
        {
            customerTestimonialId: extraCustomerTestimonialId,
            userId: customer.user.userId,
            body: 'Extra customer quote',
            publicationStatus: 'PENDING_REVIEW',
        },
    ]);
    await testDb.insert(cookTestimonials).values({
        cookTestimonialId,
        userId: cook.user.userId,
        cookId: cook.user.userId,
        body: 'Cook quote',
        publicationStatus: 'PENDING_REVIEW',
    });
    return { customerTestimonialId, cookTestimonialId, extraCustomerTestimonialId };
}

async function insertPage(kind: PageKind, updatedAt: Date) {
    const pageId = idCreate();
    const token = pageId.slice(0, 8);
    const copy = {
        pathName: `${kind}-${token}`,
        titleDe: 'Titel',
        descriptionDe: 'Beschreibung',
        headlineDe: 'Headline',
        subHeadlineDe: 'Sub',
        sections: [],
        updatedAt,
    };
    if (kind === 'city') {
        await testDb.insert(cities).values({
            cityId: pageId,
            nameDe: `Stadt ${token}`,
            latitude: 52.52,
            longitude: 13.405,
            ...copy,
        });
    } else if (kind === 'occasion') {
        await testDb.insert(occasions).values({ occasionId: pageId, name: `Occasion ${token}`, ...copy });
    } else {
        await testDb.insert(partners).values({ partnerId: pageId, name: `Partner ${token}`, ...copy });
    }
    return pageId;
}

async function insertJunction(kind: PageKind, pageId: string, entry: GqlSTestimonialJunctionEntryInput, index: number) {
    const row = { testimonialType: entry.testimonialType, testimonialId: entry.testimonialId, index };
    if (kind === 'city') {
        await testDb.insert(cityTestimonials).values({ cityId: pageId, ...row });
    } else if (kind === 'occasion') {
        await testDb.insert(occasionTestimonials).values({ occasionId: pageId, ...row });
    } else {
        await testDb.insert(partnerTestimonials).values({ partnerId: pageId, ...row });
    }
}

async function readJunctions(kind: PageKind, pageId: string) {
    if (kind === 'city') {
        return testDb.select().from(cityTestimonials).where(eq(cityTestimonials.cityId, pageId)).orderBy(asc(cityTestimonials.index));
    }
    if (kind === 'occasion') {
        return testDb
            .select()
            .from(occasionTestimonials)
            .where(eq(occasionTestimonials.occasionId, pageId))
            .orderBy(asc(occasionTestimonials.index));
    }
    return testDb
        .select()
        .from(partnerTestimonials)
        .where(eq(partnerTestimonials.partnerId, pageId))
        .orderBy(asc(partnerTestimonials.index));
}

async function readUpdatedAt(kind: PageKind, pageId: string) {
    if (kind === 'city') {
        const [row] = await testDb.select({ updatedAt: cities.updatedAt }).from(cities).where(eq(cities.cityId, pageId));
        return row!.updatedAt;
    }
    if (kind === 'occasion') {
        const [row] = await testDb.select({ updatedAt: occasions.updatedAt }).from(occasions).where(eq(occasions.occasionId, pageId));
        return row!.updatedAt;
    }
    const [row] = await testDb.select({ updatedAt: partners.updatedAt }).from(partners).where(eq(partners.partnerId, pageId));
    return row!.updatedAt;
}

async function updatePage(
    kind: PageKind,
    admin: Awaited<ReturnType<typeof adminSetup>>,
    pageId: string,
    entries: GqlSTestimonialJunctionEntryInput[],
) {
    const parent = adminMutationParent(admin.user.userId);
    if (kind === 'city') {
        return adminCityTestimonialsUpdate(parent, { cityId: pageId, entries }, admin.requestingSession, admin.serverRuntime);
    }
    if (kind === 'occasion') {
        return adminOccasionTestimonialsUpdate(parent, { occasionId: pageId, entries }, admin.requestingSession, admin.serverRuntime);
    }
    return adminPartnerTestimonialsUpdate(parent, { partnerId: pageId, entries }, admin.requestingSession, admin.serverRuntime);
}

for (const kind of pages) {
    describe(commandName[kind], () => {
        it('replaces assignments in order, bumps updatedAt, and publishes adminUpdates', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-replace`);
            const stale = new Date('2020-01-01T00:00:00.000Z');
            const pageId = await insertPage(kind, stale);
            const { customerTestimonialId, cookTestimonialId, extraCustomerTestimonialId } = await seedQuotes();
            await insertJunction(kind, pageId, { testimonialType: 'CUSTOMER', testimonialId: extraCustomerTestimonialId }, 0);

            // Act
            const result = await updatePage(kind, admin, pageId, [
                { testimonialType: 'COOK', testimonialId: cookTestimonialId },
                { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId },
            ]);

            // Assert
            expect(result).toEqual({ success: true, referenceId: pageId });
            const [rows, updatedAt] = await Promise.all([readJunctions(kind, pageId), readUpdatedAt(kind, pageId)]);
            expect(rows.map((row) => ({ type: row.testimonialType, id: row.testimonialId, index: row.index }))).toEqual([
                { type: 'COOK', id: cookTestimonialId, index: 0 },
                { type: 'CUSTOMER', id: customerTestimonialId, index: 1 },
            ]);
            expect(updatedAt.getTime()).toBeGreaterThan(stale.getTime());
            expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        });

        it('clears assignments when entries is empty and still bumps updatedAt', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-clear`);
            const stale = new Date('2020-01-01T00:00:00.000Z');
            const pageId = await insertPage(kind, stale);
            const { customerTestimonialId } = await seedQuotes();
            await insertJunction(kind, pageId, { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId }, 0);

            // Act
            const result = await updatePage(kind, admin, pageId, []);

            // Assert
            expect(result).toEqual({ success: true, referenceId: pageId });
            const [rows, updatedAt] = await Promise.all([readJunctions(kind, pageId), readUpdatedAt(kind, pageId)]);
            expect(rows).toHaveLength(0);
            expect(updatedAt.getTime()).toBeGreaterThan(stale.getTime());
            expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        });

        it('accepts customer-only entries', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-customer-only`);
            const pageId = await insertPage(kind, new Date('2020-01-01T00:00:00.000Z'));
            const { customerTestimonialId, extraCustomerTestimonialId } = await seedQuotes();

            // Act
            await updatePage(kind, admin, pageId, [
                { testimonialType: 'CUSTOMER', testimonialId: extraCustomerTestimonialId },
                { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId },
            ]);

            // Assert
            const rows = await readJunctions(kind, pageId);
            expect(rows.map((row) => row.testimonialId)).toEqual([extraCustomerTestimonialId, customerTestimonialId]);
            expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        });

        it('accepts cook-only entries', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-cook-only`);
            const pageId = await insertPage(kind, new Date('2020-01-01T00:00:00.000Z'));
            const { cookTestimonialId } = await seedQuotes();

            // Act
            await updatePage(kind, admin, pageId, [{ testimonialType: 'COOK', testimonialId: cookTestimonialId }]);

            // Assert
            const rows = await readJunctions(kind, pageId);
            expect(rows).toEqual([expect.objectContaining({ testimonialType: 'COOK', testimonialId: cookTestimonialId, index: 0 })]);
            expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        });

        it('throws when the page does not exist, logs the error, and does not publish', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-missing-page`);
            const pageId = idCreate();

            // Act + Assert
            await expect(updatePage(kind, admin, pageId, [])).rejects.toThrow(new RegExp(`${kind} not found`));

            const logRows = await findLogsForSession(admin.requestingSession.sessionId);
            expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
            expect(logRows[0]!.message).toMatch(new RegExp(`${kind} not found`));
        });

        it('throws on a duplicate entry and leaves previous rows unchanged', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-duplicate`);
            const stale = new Date('2020-01-01T00:00:00.000Z');
            const pageId = await insertPage(kind, stale);
            const { customerTestimonialId } = await seedQuotes();
            await insertJunction(kind, pageId, { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId }, 0);

            // Act + Assert
            await expect(
                updatePage(kind, admin, pageId, [
                    { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId },
                    { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId },
                ]),
            ).rejects.toThrow(/duplicate entry/);

            const [rows, updatedAt, logRows] = await Promise.all([
                readJunctions(kind, pageId),
                readUpdatedAt(kind, pageId),
                findLogsForSession(admin.requestingSession.sessionId),
            ]);
            expect(rows.map((row) => row.testimonialId)).toEqual([customerTestimonialId]);
            expect(updatedAt).toEqual(stale);
            expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
            expect(logRows[0]!.message).toMatch(/duplicate entry/);
        });

        it('throws when a customer testimonial is missing and leaves previous rows unchanged', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-missing-customer`);
            const stale = new Date('2020-01-01T00:00:00.000Z');
            const pageId = await insertPage(kind, stale);
            const { cookTestimonialId } = await seedQuotes();
            await insertJunction(kind, pageId, { testimonialType: 'COOK', testimonialId: cookTestimonialId }, 0);

            // Act + Assert
            await expect(
                updatePage(kind, admin, pageId, [
                    { testimonialType: 'COOK', testimonialId: cookTestimonialId },
                    { testimonialType: 'CUSTOMER', testimonialId: idCreate() },
                ]),
            ).rejects.toThrow(/testimonial not found/);

            const [rows, updatedAt] = await Promise.all([readJunctions(kind, pageId), readUpdatedAt(kind, pageId)]);
            expect(rows.map((row) => row.testimonialId)).toEqual([cookTestimonialId]);
            expect(updatedAt).toEqual(stale);
            expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
            expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/testimonial not found/);
        });

        it('throws when a cook testimonial is missing and leaves previous rows unchanged', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-missing-cook`);
            const stale = new Date('2020-01-01T00:00:00.000Z');
            const pageId = await insertPage(kind, stale);
            const { customerTestimonialId } = await seedQuotes();
            await insertJunction(kind, pageId, { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId }, 0);

            // Act + Assert
            await expect(
                updatePage(kind, admin, pageId, [
                    { testimonialType: 'CUSTOMER', testimonialId: customerTestimonialId },
                    { testimonialType: 'COOK', testimonialId: idCreate() },
                ]),
            ).rejects.toThrow(/testimonial not found/);

            const [rows, updatedAt] = await Promise.all([readJunctions(kind, pageId), readUpdatedAt(kind, pageId)]);
            expect(rows.map((row) => row.testimonialId)).toEqual([customerTestimonialId]);
            expect(updatedAt).toEqual(stale);
            expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
            expect((await findLogsForSession(admin.requestingSession.sessionId))[0]!.message).toMatch(/testimonial not found/);
        });

        it('throws Unauthorized when the admin user does not exist and does not publish', async () => {
            // Arrange
            const { serverRuntime, requestingSession } = await commandSetup();
            const pageId = idCreate();

            // Act + Assert
            const parent = adminMutationParent(idCreate());
            const attempt =
                kind === 'city'
                    ? adminCityTestimonialsUpdate(parent, { cityId: pageId, entries: [] }, requestingSession, serverRuntime)
                    : kind === 'occasion'
                      ? adminOccasionTestimonialsUpdate(parent, { occasionId: pageId, entries: [] }, requestingSession, serverRuntime)
                      : adminPartnerTestimonialsUpdate(parent, { partnerId: pageId, entries: [] }, requestingSession, serverRuntime);
            await expect(attempt).rejects.toThrow(/Unauthorized/);

            expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
            expect(await findLogsForSession(requestingSession.sessionId)).toHaveLength(0);
        });

        it('throws Unauthorized when legal acceptance is stale and does not publish', async () => {
            // Arrange
            const admin = await adminSetup(`${kind}-stale`, true);
            const stale = new Date('2020-01-01T00:00:00.000Z');
            const pageId = await insertPage(kind, stale);

            // Act + Assert
            await expect(updatePage(kind, admin, pageId, [])).rejects.toThrow(/Unauthorized/);

            expect(await readUpdatedAt(kind, pageId)).toEqual(stale);
            expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
            expect(await findLogsForSession(admin.requestingSession.sessionId)).toHaveLength(0);
        });
    });
}
