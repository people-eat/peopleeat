import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { users } from '../db/schema';
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
        expect(insights.birthDateSampleSize).toBeGreaterThanOrEqual(3);
        expect(insights.medianAge).not.toBeNull();
        expect(insights.medianAge!).toBeGreaterThan(0);
        expect(insights.averageAge).not.toBeNull();
        expect(insights.averageAge!).toBeGreaterThan(0);

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
            birthDate: `1992-${monthDayInDays(40)}`,
        });
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
        expect(birthdays.some((row) => row.firstName === `${token}-anon`)).toBe(false);
    });
});
