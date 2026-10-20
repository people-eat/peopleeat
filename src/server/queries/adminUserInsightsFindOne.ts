import { and, count, desc, isNotNull, ne, sql } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUserInsights, GqlSLocale, GqlSSession, GqlSUserPreferredCommunication } from '../graphql/generated';

const TIME_ZONE_STATS_TAKE = 12;

/** Demographic / preference aggregates for the admin users overview. */
export async function adminUserInsightsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminUserInsights> {
    try {
        const notAnonymized = ne(users.status, 'ANONYMIZED');

        const [accountRow, ageRow, preferredCommunicationRows, localeRows, timeZoneRows] = await Promise.all([
            serverRuntime.db
                .select({ value: count() })
                .from(users)
                .where(notAnonymized)
                .then((rows) => rows[0]),
            serverRuntime.db
                .select({
                    averageAge: sql<string | number | null>`AVG(DATE_PART('year', AGE(CURRENT_DATE, ${users.birthDate})))`,
                    birthDateSampleSize: count(),
                })
                .from(users)
                .where(and(notAnonymized, isNotNull(users.birthDate)))
                .then((rows) => rows[0]),
            serverRuntime.db
                .select({
                    preferredCommunication: users.preferredCommunication,
                    value: count(),
                })
                .from(users)
                .where(notAnonymized)
                .groupBy(users.preferredCommunication)
                .orderBy(desc(count())),
            serverRuntime.db
                .select({
                    locale: users.locale,
                    value: count(),
                })
                .from(users)
                .where(notAnonymized)
                .groupBy(users.locale)
                .orderBy(desc(count()), users.locale),
            serverRuntime.db
                .select({
                    timeZone: users.timeZone,
                    value: count(),
                })
                .from(users)
                .where(notAnonymized)
                .groupBy(users.timeZone)
                .orderBy(desc(count()), users.timeZone)
                .limit(TIME_ZONE_STATS_TAKE),
        ]);

        const averageAgeRaw = ageRow?.averageAge;
        const averageAge =
            averageAgeRaw == null || averageAgeRaw === ''
                ? null
                : typeof averageAgeRaw === 'number'
                  ? averageAgeRaw
                  : Number(averageAgeRaw);

        return {
            accountCount: accountRow?.value ?? 0,
            averageAge: averageAge == null || Number.isNaN(averageAge) ? null : averageAge,
            birthDateSampleSize: ageRow?.birthDateSampleSize ?? 0,
            preferredCommunication: preferredCommunicationRows.map((row) => ({
                preferredCommunication: (row.preferredCommunication ?? null) as GqlSUserPreferredCommunication | null,
                count: row.value,
            })),
            locales: localeRows.map((row) => ({
                locale: row.locale as GqlSLocale,
                count: row.value,
            })),
            timeZones: timeZoneRows.map((row) => ({
                timeZone: row.timeZone,
                count: row.value,
            })),
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
