import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUpcomingBirthdaysArgs, GqlSAdminUserUpcomingBirthday, GqlSSession } from '../graphql/generated';
import { adminUserTypesByUserIdFindMany } from '../utils/adminUserTypesByUserIdFindMany';
import { findManyTake } from '../utils/findManyTake';

type UpcomingBirthdayRow = {
    userId: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    nextBirthday: string;
};

/** Next birthdays among non-anonymized users with a birth date. */
export async function adminUserUpcomingBirthdaysFindMany(
    args: GqlSAdminUpcomingBirthdaysArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminUserUpcomingBirthday[]> {
    try {
        const take = findManyTake(args.take);
        const result = await serverRuntime.db.execute<UpcomingBirthdayRow>(sql`
            WITH candidates AS (
                SELECT
                    "userId",
                    "firstName",
                    "lastName",
                    "birthDate",
                    (
                        CASE
                            WHEN (
                                "birthDate"
                                + (DATE_PART('year', AGE(CURRENT_DATE, "birthDate")) || ' years')::interval
                            )::date >= CURRENT_DATE
                            THEN (
                                "birthDate"
                                + (DATE_PART('year', AGE(CURRENT_DATE, "birthDate")) || ' years')::interval
                            )::date
                            ELSE (
                                "birthDate"
                                + ((DATE_PART('year', AGE(CURRENT_DATE, "birthDate")) + 1) || ' years')::interval
                            )::date
                        END
                    ) AS "nextBirthday"
                FROM "Users"
                WHERE "birthDate" IS NOT NULL
                  AND "status" <> 'ANONYMIZED'
            )
            SELECT
                "userId",
                "firstName",
                "lastName",
                "birthDate"::text AS "birthDate",
                "nextBirthday"::text AS "nextBirthday"
            FROM candidates
            ORDER BY "nextBirthday" ASC, "lastName" ASC, "firstName" ASC
            LIMIT ${take}
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const typesByUserId = await adminUserTypesByUserIdFindMany(
            rows.map((row) => row.userId),
            serverRuntime.db,
        );

        return rows.map((row) => ({
            userId: row.userId,
            firstName: row.firstName,
            lastName: row.lastName,
            types: typesByUserId.get(row.userId) ?? ['customer'],
            birthDate: row.birthDate,
            nextBirthday: row.nextBirthday,
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
