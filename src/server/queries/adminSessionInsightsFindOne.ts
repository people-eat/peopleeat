import { and, count, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminSessionBrowser,
    GqlSAdminSessionBrowserStat,
    GqlSAdminSessionDeviceClass,
    GqlSAdminSessionDeviceStat,
    GqlSAdminSessionInsights,
    GqlSAdminSessionInsightsArgs,
    GqlSAdminSessionLandingPathStat,
    GqlSAdminSessionOperatingSystem,
    GqlSAdminSessionOperatingSystemStat,
    GqlSAdminSessionReferrerStat,
    GqlSSession,
} from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { findManyTake } from '../utils/findManyTake';

const DEVICE_CLASS_ORDER: GqlSAdminSessionDeviceClass[] = ['mobile', 'tablet', 'desktop', 'unknown'];
const OPERATING_SYSTEM_ORDER: GqlSAdminSessionOperatingSystem[] = [
    'ios',
    'android',
    'windows',
    'macos',
    'linux',
    'chromeOs',
    'other',
    'unknown',
];
const BROWSER_ORDER: GqlSAdminSessionBrowser[] = ['chrome', 'safari', 'firefox', 'edge', 'opera', 'samsung', 'other', 'unknown'];

/** Coarse device class from `Sessions.userAgent` (Postgres POSIX heuristic). */
const deviceClassSql = sql<GqlSAdminSessionDeviceClass>`
    CASE
        WHEN ${sessions.userAgent} IS NULL OR trim(${sessions.userAgent}) = '' THEN 'unknown'
        WHEN ${sessions.userAgent} ~* '(iPad|Tablet)' THEN 'tablet'
        WHEN ${sessions.userAgent} ~* 'Android' AND ${sessions.userAgent} !~* 'Mobile' THEN 'tablet'
        WHEN ${sessions.userAgent} ~* '(Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini)' THEN 'mobile'
        WHEN ${sessions.userAgent} ~* 'Android' THEN 'mobile'
        ELSE 'desktop'
    END
`;

/** OS family from `Sessions.userAgent` (Postgres POSIX heuristic). */
const operatingSystemSql = sql<GqlSAdminSessionOperatingSystem>`
    CASE
        WHEN ${sessions.userAgent} IS NULL OR trim(${sessions.userAgent}) = '' THEN 'unknown'
        WHEN ${sessions.userAgent} ~* '(iPhone|iPad|iPod)' THEN 'ios'
        WHEN ${sessions.userAgent} ~* 'Android' THEN 'android'
        WHEN ${sessions.userAgent} ~* 'Windows' THEN 'windows'
        WHEN ${sessions.userAgent} ~* 'CrOS' THEN 'chromeOs'
        WHEN ${sessions.userAgent} ~* '(Mac OS X|Macintosh)' THEN 'macos'
        WHEN ${sessions.userAgent} ~* 'Linux' THEN 'linux'
        ELSE 'other'
    END
`;

/** Browser family from `Sessions.userAgent` (Postgres POSIX heuristic; order matters). */
const browserSql = sql<GqlSAdminSessionBrowser>`
    CASE
        WHEN ${sessions.userAgent} IS NULL OR trim(${sessions.userAgent}) = '' THEN 'unknown'
        WHEN ${sessions.userAgent} ~* 'Edg/' THEN 'edge'
        WHEN ${sessions.userAgent} ~* '(OPR/|Opera)' THEN 'opera'
        WHEN ${sessions.userAgent} ~* 'SamsungBrowser' THEN 'samsung'
        WHEN ${sessions.userAgent} ~* 'Firefox/' THEN 'firefox'
        WHEN ${sessions.userAgent} ~* 'Chrome/' THEN 'chrome'
        WHEN ${sessions.userAgent} ~* 'Safari/' THEN 'safari'
        ELSE 'other'
    END
`;

function humanSessionInsightsWhere(startDateTime: Date, endDateTime: Date) {
    return and(
        eq(sessions.isBot, false),
        isNull(sessions.impersonationReturnSessionId),
        gte(sessions.createdAt, startDateTime),
        lte(sessions.createdAt, endDateTime),
    );
}

function fillOrderedStats<TKey extends string>(
    order: readonly TKey[],
    rows: { key: TKey; value: number }[],
): { key: TKey; count: number }[] {
    const counts = new Map<TKey, number>(order.map((key) => [key, 0]));
    for (const row of rows) {
        if (counts.has(row.key)) {
            counts.set(row.key, row.value);
        }
    }
    return order
        .map((key) => ({ key, count: counts.get(key) ?? 0 }))
        .filter((entry) => entry.count > 0)
        .sort((left, right) => right.count - left.count || order.indexOf(left.key) - order.indexOf(right.key));
}

/** Attribution + UA mix for the admin sessions overview. */
export async function adminSessionInsightsFindOne(
    args: GqlSAdminSessionInsightsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSessionInsights> {
    try {
        const take = findManyTake(args.take);
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
        const where = humanSessionInsightsWhere(startDateTime, endDateTime);
        const landingPathKey = sql<string | null>`NULLIF(trim(${sessions.landingPath}), '')`;
        const referrerKey = sql<string | null>`NULLIF(trim(${sessions.referrer}), '')`;
        const db = serverRuntime.db;

        const [sessionCountRow, landingPathRows, referrerRows, deviceRows, operatingSystemRows, browserRows] = await Promise.all([
            db
                .select({ value: count() })
                .from(sessions)
                .where(where)
                .then((rows) => rows[0]),
            db
                .select({
                    landingPath: landingPathKey,
                    sessionCount: count(),
                })
                .from(sessions)
                .where(where)
                .groupBy(landingPathKey)
                .orderBy(desc(count()), landingPathKey)
                .limit(take),
            db
                .select({
                    referrer: referrerKey,
                    sessionCount: count(),
                })
                .from(sessions)
                .where(where)
                .groupBy(referrerKey)
                .orderBy(desc(count()), referrerKey)
                .limit(take),
            db
                .select({
                    deviceClass: deviceClassSql,
                    sessionCount: count(),
                })
                .from(sessions)
                .where(where)
                .groupBy(deviceClassSql),
            db
                .select({
                    operatingSystem: operatingSystemSql,
                    sessionCount: count(),
                })
                .from(sessions)
                .where(where)
                .groupBy(operatingSystemSql),
            db
                .select({
                    browser: browserSql,
                    sessionCount: count(),
                })
                .from(sessions)
                .where(where)
                .groupBy(browserSql),
        ]);

        const landingPaths: GqlSAdminSessionLandingPathStat[] = landingPathRows.map((row) => ({
            landingPath: row.landingPath,
            count: row.sessionCount,
        }));
        const referrers: GqlSAdminSessionReferrerStat[] = referrerRows.map((row) => ({
            referrer: row.referrer,
            count: row.sessionCount,
        }));
        const devices: GqlSAdminSessionDeviceStat[] = fillOrderedStats(
            DEVICE_CLASS_ORDER,
            deviceRows.map((row) => ({ key: row.deviceClass, value: row.sessionCount })),
        ).map((entry) => ({ deviceClass: entry.key, count: entry.count }));
        const operatingSystems: GqlSAdminSessionOperatingSystemStat[] = fillOrderedStats(
            OPERATING_SYSTEM_ORDER,
            operatingSystemRows.map((row) => ({ key: row.operatingSystem, value: row.sessionCount })),
        ).map((entry) => ({ operatingSystem: entry.key, count: entry.count }));
        const browsers: GqlSAdminSessionBrowserStat[] = fillOrderedStats(
            BROWSER_ORDER,
            browserRows.map((row) => ({ key: row.browser, value: row.sessionCount })),
        ).map((entry) => ({ browser: entry.key, count: entry.count }));

        return {
            sessionCount: sessionCountRow?.value ?? 0,
            landingPaths,
            referrers,
            devices,
            operatingSystems,
            browsers,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
