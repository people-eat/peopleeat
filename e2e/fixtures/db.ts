import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '../../src/server/db/schema';
import {
    admins,
    bookingRequestOffers,
    bookingRequestParticipants,
    bookingRequests,
    cookieSettings,
    cooks,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
    outboundEmails,
    sessions,
    users,
} from '../../src/server/db/schema';
import type { BookingRequestExactEventAddress, BookingRequestPublicationStatus } from '../../src/server/domain/bookingRequest';
import type { CookTravelOriginAddress } from '../../src/server/domain/cook';
import { bookingRequestOfferPriceCalculate } from '../../src/shared/bookingRequestOfferPrice';
import { idCreate } from '../../src/shared/idCreate';
import { e2eEnv } from '../env';

const e2eDb = drizzle(e2eEnv.databaseUrl, { schema });

const defaultLegalAcceptance = {
    lastAcceptedPrivacyPolicy: new Date('9999-12-31T00:00:00.000Z'),
    lastAcceptedTerms: new Date('9999-12-31T00:00:00.000Z'),
};

export const berlinAddress: BookingRequestExactEventAddress = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

export const munichTravelOrigin: CookTravelOriginAddress = {
    displayText: 'Munich',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Marienplatz 1',
    addressLine2: '',
    city: 'Munich',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

export type SeededActor = {
    userId: string;
    sessionId: string;
    emailAddress: string;
    firstName: string;
    lastName: string;
};

async function seedUser(input: { firstName: string; lastName: string; emailPrefix: string }): Promise<SeededActor> {
    const userId = idCreate();
    const sessionId = idCreate();
    // OTP verify normalizes emails to lowercase; nanoIds are mixed-case.
    const emailAddress = `${input.emailPrefix}-${userId.toLowerCase()}@example.com`;

    const [user] = await e2eDb
        .insert(users)
        .values({
            userId,
            emailAddress,
            firstName: input.firstName,
            lastName: input.lastName,
            // E2e drives `/en/…` UI; default DB locale is `de` and would open
            // LocaleMismatchGate over every dialog/button.
            locale: 'en',
            ...defaultLegalAcceptance,
        })
        .returning();
    if (!user) throw new Error('e2e seedUser: insert returned no rows');

    await e2eDb.insert(sessions).values({ sessionId, userId: user.userId });
    // Skip the cookie banner so dialogs (e.g. publication approve) are not masked.
    await e2eDb.insert(cookieSettings).values({
        sessionId,
        googleAnalytics: false,
        clarity: false,
    });

    return {
        userId: user.userId,
        sessionId,
        emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
    };
}

export async function seedCustomer(overrides?: { firstName?: string; lastName?: string }): Promise<SeededActor> {
    return seedUser({
        firstName: overrides?.firstName ?? 'E2E',
        lastName: overrides?.lastName ?? 'Customer',
        emailPrefix: 'e2e-customer',
    });
}

/** Anonymous session + cookie settings so the consent banner does not mask auth dialogs. */
export async function seedAnonymousSession(): Promise<{ sessionId: string }> {
    const sessionId = idCreate();
    await e2eDb.insert(sessions).values({ sessionId });
    await e2eDb.insert(cookieSettings).values({
        sessionId,
        googleAnalytics: false,
        clarity: false,
    });
    return { sessionId };
}

export async function seedAdmin(): Promise<SeededActor> {
    const actor = await seedUser({ firstName: 'E2E', lastName: 'Admin', emailPrefix: 'e2e-admin' });
    await e2eDb.insert(admins).values({ adminId: actor.userId });
    return actor;
}

export async function seedCook(input: {
    firstName: string;
    lastName: string;
    emailPrefix: string;
    travelOrigin: CookTravelOriginAddress;
    maximumTravelDistance: number;
}): Promise<SeededActor> {
    const actor = await seedUser({
        firstName: input.firstName,
        lastName: input.lastName,
        emailPrefix: input.emailPrefix,
    });
    await e2eDb.insert(cooks).values({
        cookId: actor.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: input.travelOrigin,
        travelExpensesAmount: 25,
        maximumTravelDistance: input.maximumTravelDistance,
        stripeAccountId: `acct_e2e_${actor.userId.slice(0, 8)}`,
        stripeAccountActive: true,
    });
    return actor;
}

/**
 * Inventory menu complete enough for offer pickers (titled course + ≥1 meal option).
 * Offer create UI rejects submit without at least one selected complete menu.
 */
export async function seedCookMenu(input: { cookId: string; title?: string }): Promise<{ menuId: string; title: string }> {
    const menuId = idCreate();
    const mealId = idCreate();
    const courseId = idCreate();
    const title = input.title ?? 'E2E tasting menu';

    await e2eDb.insert(meals).values({
        mealId,
        cookId: input.cookId,
        title: 'E2E signature dish',
        description: 'Seeded for offer create',
    });
    await e2eDb.insert(menus).values({
        menuId,
        cookId: input.cookId,
        title,
        description: 'Seeded complete menu for e2e offer create',
    });
    await e2eDb.insert(menuCourses).values({
        courseId,
        menuId,
        cookId: input.cookId,
        index: 0,
        title: 'Main',
        mealSelectionLimit: null,
    });
    await e2eDb.insert(menuCourseMealOptions).values({
        mealOptionId: idCreate(),
        courseId,
        cookId: input.cookId,
        mealId,
        index: 0,
    });

    return { menuId, title };
}

export async function seedBookingRequest(input: {
    customerUserId: string;
    occasion: string;
    exactEventAddress?: BookingRequestExactEventAddress;
    publicationStatus?: BookingRequestPublicationStatus;
    /** Defaults to 1; use ≥12 for large-group / admin-review shape. */
    participantCount?: number;
    /** Defaults to +14 days. Use ≥15 days for SetupIntent accept path. */
    dateTime?: Date;
}): Promise<{ bookingRequestId: string; occasion: string }> {
    const bookingRequestId = idCreate();
    const exactEventAddress = input.exactEventAddress ?? {
        ...berlinAddress,
        latitude: 52.53,
        longitude: 13.41,
    };
    const participantCount = input.participantCount ?? 1;
    const dateTime = input.dateTime ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await e2eDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: input.customerUserId,
        occasion: input.occasion,
        dateTime,
        exactEventAddress,
        priceClassType: 'MEDIUM',
        originalMessage: 'E2E booking request',
        publicationStatus: input.publicationStatus ?? 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await e2eDb.insert(bookingRequestParticipants).values(
        Array.from({ length: participantCount }, (_, index) => ({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT' as const,
            name: `Participant ${index + 1}`,
            restrictions: [],
        })),
    );

    return { bookingRequestId, occasion: input.occasion };
}

/**
 * Cook-accepted, customer-pending price-only offer (fee columns from shared calculator).
 * Use for journeys that start after offer create (e.g. customer accept).
 */
export async function seedBookingRequestOffer(input: {
    bookingRequestId: string;
    cookId: string;
    menuPriceCents?: number;
    travelExpensesCents?: number;
}): Promise<{ bookingRequestOfferId: string }> {
    const menuPriceCents = input.menuPriceCents ?? 20_000;
    const travelExpensesCents = input.travelExpensesCents ?? 2_500;
    const price = bookingRequestOfferPriceCalculate({ menuPriceCents, travelExpensesCents });
    const bookingRequestOfferId = idCreate();

    await e2eDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId: input.bookingRequestId,
        cookId: input.cookId,
        cookAccepted: true,
        userAccepted: null,
        userUnreadNotificationCount: 1,
        cookUnreadNotificationCount: 0,
        travelDistanceKm: 5,
        menuPriceCents: price.menuPriceCents,
        travelExpensesCents: price.travelExpensesCents,
        paymentProviderFeeCents: price.paymentProviderFeeCents,
        platformFeePercentCook: price.platformFeePercentCook,
        platformFeePercentCustomer: price.platformFeePercentCustomer,
        platformFeeCentsCook: price.platformFeeCentsCook,
        platformFeeCentsCustomer: price.platformFeeCentsCustomer,
        payoutCentsCook: price.payoutCentsCook,
        totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
        paymentStatus: 'EMPTY',
    });

    return { bookingRequestOfferId };
}

/** Cook-notify emails stamped for a booking request (approve / manual notify). */
export async function cookNotifyEmailsFind(bookingRequestId: string): Promise<Array<{ toEmail: string; userId: string | null }>> {
    return e2eDb
        .select({
            toEmail: outboundEmails.toEmail,
            userId: outboundEmails.userId,
        })
        .from(outboundEmails)
        .where(and(eq(outboundEmails.relatedEntityId, bookingRequestId), eq(outboundEmails.purpose, 'BOOKING_REQUEST_COOK_NOTIFY')));
}

/**
 * Latest AUTH_EMAIL_OTP code for an address (parsed from the email subject).
 * Use with `expect.poll` after the UI requests a code.
 */
export async function authEmailOtpCodeFind(emailAddress: string): Promise<string | null> {
    const [row] = await e2eDb
        .select({ subject: outboundEmails.subject })
        .from(outboundEmails)
        .where(and(eq(outboundEmails.toEmail, emailAddress.toLowerCase()), eq(outboundEmails.purpose, 'AUTH_EMAIL_OTP')))
        .orderBy(desc(outboundEmails.createdAt))
        .limit(1);
    const match = row?.subject.match(/\b(\d{6})\b/);
    return match?.[1] ?? null;
}
