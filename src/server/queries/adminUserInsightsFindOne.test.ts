import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    authOauthIdentities,
    authPasskeys,
    authTimeBasedOneTimePasswords,
    bookingRequestOffers,
    bookingRequests,
    cooks,
    users,
} from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminUserInsightsFindOne } from './adminUserInsightsFindOne';
import { adminUserUpcomingBirthdaysFindMany } from './adminUserUpcomingBirthdaysFindMany';

function monthDayInDays(daysFromToday: number): string {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + daysFromToday);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
}

const sampleAddress = {
    displayText: 'Musterstraße 1, 80331 München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Musterstraße 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

describe('adminUserInsightsFindOne', () => {
    it('aggregates age, preferred communication, locale, and time zone', async () => {
        // Arrange
        const token = `insights-${idCreate().slice(0, 8)}`;
        const admin = await commandSetup.withUser({
            firstName: `${token}-admin`,
            lastName: 'User',
            birthDate: '1990-06-15',
            preferredCommunication: 'E_MAIL',
            locale: 'de',
            timeZone: 'Europe/Berlin',
        });
        await commandSetup.withUser({
            firstName: `${token}-a`,
            lastName: 'User',
            birthDate: '1980-01-01',
            preferredCommunication: 'WHATS_APP',
            locale: 'en',
            timeZone: 'America/New_York',
        });
        await commandSetup.withUser({
            firstName: `${token}-b`,
            lastName: 'User',
            birthDate: '2000-01-01',
            preferredCommunication: 'WHATS_APP',
            locale: 'de',
            timeZone: 'Europe/Berlin',
        });
        await testDb.insert(users).values({
            userId: idCreate(),
            firstName: `${token}-anon`,
            lastName: 'User',
            emailAddress: null,
            status: 'ANONYMIZED',
            birthDate: '1970-01-01',
            preferredCommunication: 'CALL',
            locale: 'en',
            timeZone: 'Pacific/Honolulu',
        });

        // Act
        const insights = await adminUserInsightsFindOne(admin.requestingSession, admin.serverRuntime);

        // Assert
        const totalWithBirthDate =
            insights.ageBySegment.cooks.birthDateSampleSize +
            insights.ageBySegment.potentialCustomers.birthDateSampleSize +
            insights.ageBySegment.actualCustomers.birthDateSampleSize;
        expect(totalWithBirthDate).toBeGreaterThanOrEqual(3);
        expect(insights.ageBySegment.potentialCustomers.birthDateSampleSize).toBeGreaterThanOrEqual(3);
        expect(insights.ageBySegment.potentialCustomers.medianAge).not.toBeNull();
        expect(insights.ageBySegment.potentialCustomers.medianAge!).toBeGreaterThan(0);
        expect(insights.ageBySegment.potentialCustomers.averageAge).not.toBeNull();
        expect(insights.ageBySegment.potentialCustomers.averageAge!).toBeGreaterThan(0);

        const whatsApp = insights.preferredCommunication.find((row) => row.preferredCommunication === 'WHATS_APP');
        expect(whatsApp?.count).toBeGreaterThanOrEqual(2);

        const de = insights.locales.find((row) => row.locale === 'de');
        expect(de?.count).toBeGreaterThanOrEqual(2);

        const berlin = insights.timeZones.find((row) => row.timeZone === 'Europe/Berlin');
        expect(berlin?.count).toBeGreaterThanOrEqual(2);

        // Anonymized Honolulu row must not appear as a time-zone bucket from this seed.
        // Other tests may have seeded Honolulu; only assert our non-anon zones are present.
        expect(insights.timeZones.some((row) => row.timeZone === 'America/New_York')).toBe(true);
    });

    it('splits age stats into cooks, potential customers, and actual customers', async () => {
        const token = `age-seg-${idCreate().slice(0, 8)}`;
        const admin = await commandSetup.withUser({
            firstName: `${token}-admin`,
            lastName: 'User',
        });

        const cook = await commandSetup.withUser({
            firstName: `${token}-cook`,
            lastName: 'User',
            birthDate: '1985-01-01',
        });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        // Customer with a pending (not dual-accepted) offer stays potential.
        const potential = await commandSetup.withUser({
            firstName: `${token}-potential`,
            lastName: 'User',
            birthDate: '1995-01-01',
        });
        const pendingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: pendingRequestId,
            userId: potential.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: sampleAddress,
            priceClassType: 'MEDIUM',
            originalMessage: 'Please cook for us.',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId: pendingRequestId,
            cookId: cook.user.userId,
            cookAccepted: true,
            userAccepted: null,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 4,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 900,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_900,
            paymentStatus: 'EMPTY',
        });

        const actual = await commandSetup.withUser({
            firstName: `${token}-actual`,
            lastName: 'User',
            birthDate: '1975-01-01',
        });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: actual.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: sampleAddress,
            priceClassType: 'MEDIUM',
            originalMessage: 'Please cook for us.',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId: cook.user.userId,
            cookAccepted: true,
            userAccepted: true,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 4,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 900,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_900,
            paymentStatus: 'EMPTY',
        });

        // Dual-accepted offer without birth date must not inflate sample sizes.
        const actualNoBirthDate = await commandSetup.withUser({
            firstName: `${token}-actual-no-birth`,
            lastName: 'User',
            birthDate: null,
        });
        const bookingRequestIdNoBirthDate = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: bookingRequestIdNoBirthDate,
            userId: actualNoBirthDate.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: sampleAddress,
            priceClassType: 'MEDIUM',
            originalMessage: 'Please cook for us.',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId: bookingRequestIdNoBirthDate,
            cookId: cook.user.userId,
            cookAccepted: true,
            userAccepted: true,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 4,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 900,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_900,
            paymentStatus: 'EMPTY',
        });

        const insights = await adminUserInsightsFindOne(admin.requestingSession, admin.serverRuntime);

        expect(insights.ageBySegment.cooks.birthDateSampleSize).toBeGreaterThanOrEqual(1);
        expect(insights.ageBySegment.potentialCustomers.birthDateSampleSize).toBeGreaterThanOrEqual(1);
        expect(insights.ageBySegment.actualCustomers.birthDateSampleSize).toBeGreaterThanOrEqual(1);
        expect(insights.ageBySegment.cooks.medianAge).not.toBeNull();
        expect(insights.ageBySegment.potentialCustomers.medianAge).not.toBeNull();
        expect(insights.ageBySegment.actualCustomers.medianAge).not.toBeNull();
    });

    it('counts overlapping Google, passkey, and authenticator-app links', async () => {
        const admin = await commandSetup.withUser();
        await testDb.insert(authOauthIdentities).values({
            authOauthIdentityId: idCreate(),
            userId: admin.user.userId,
            provider: 'GOOGLE',
            subject: `sub-${admin.user.userId}`,
        });
        await testDb.insert(authPasskeys).values({
            authPasskeyId: idCreate(),
            userId: admin.user.userId,
            credentialId: `cred-${admin.user.userId}`,
            publicKey: Buffer.from([1, 2, 3, 4]),
            counter: 0,
            transports: ['internal'],
            deviceType: 'singleDevice',
            backedUp: false,
        });
        await testDb.insert(authTimeBasedOneTimePasswords).values({
            authTimeBasedOneTimePasswordId: idCreate(),
            userId: admin.user.userId,
            secretEncrypted: 'test-secret',
            confirmedAt: new Date(),
            recoveryCodes: [],
        });

        const insights = await adminUserInsightsFindOne(admin.requestingSession, admin.serverRuntime);

        expect(insights.googleLinkedAccountCount).toBeGreaterThanOrEqual(1);
        expect(insights.passkeyAccountCount).toBeGreaterThanOrEqual(1);
        expect(insights.totpAccountCount).toBeGreaterThanOrEqual(1);
    });
});

describe('adminUserUpcomingBirthdaysFindMany', () => {
    it('returns upcoming birthdays sorted by next occurrence and skips anonymized', async () => {
        // Arrange
        const token = `bday-${idCreate().slice(0, 8)}`;
        const admin = await commandSetup.withUser({
            firstName: `${token}-admin`,
            lastName: 'User',
        });
        const soon = await commandSetup.withUser({
            firstName: `${token}-soon`,
            lastName: 'Alpha',
            birthDate: `1991-${monthDayInDays(10)}`,
        });
        const later = await commandSetup.withUser({
            firstName: `${token}-later`,
            lastName: 'Beta',
            birthDate: `1992-${monthDayInDays(12)}`,
        });
        await testDb.insert(cooks).values({ cookId: later.user.userId });
        await testDb.insert(users).values({
            userId: idCreate(),
            firstName: `${token}-anon`,
            lastName: 'User',
            emailAddress: null,
            status: 'ANONYMIZED',
            birthDate: `1993-${monthDayInDays(10)}`,
        });

        // Act
        const birthdays = await adminUserUpcomingBirthdaysFindMany({ take: 100 }, admin.requestingSession, admin.serverRuntime);

        // Assert
        const ours = birthdays.filter((row) => row.userId === soon.user.userId || row.userId === later.user.userId);
        expect(ours.map((row) => row.userId)).toEqual([soon.user.userId, later.user.userId]);
        expect(ours[0]!.nextBirthday <= ours[1]!.nextBirthday).toBe(true);
        expect(ours[0]!.types).toEqual(['customer']);
        expect(ours[1]!.types).toEqual(['cook']);
        expect(birthdays.some((row) => row.firstName === `${token}-anon`)).toBe(false);
    });
});
