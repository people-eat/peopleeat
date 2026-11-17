import { sql } from 'drizzle-orm';

import { formatIsoDate } from '../../shared/formatIsoDate';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSignInMethod, GqlSAdminSignInMethodStats, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

type EventRow = {
    type: string;
    outcome: string | null;
    provider: string | null;
    bucket_date: string;
    value: number | string;
};

const METHODS: GqlSAdminSignInMethod[] = ['EMAIL_OTP', 'PASSKEY', 'GOOGLE', 'FACEBOOK'];

function oauthSignInMethod(provider: string | null): 'GOOGLE' | 'FACEBOOK' | null {
    if (provider === 'GOOGLE' || provider === 'FACEBOOK') return provider;
    return null;
}

export async function adminAnalyticsSignInMethodStats(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSignInMethodStats> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(range);
        const result = await serverRuntime.db.execute<EventRow>(sql`
            SELECT
                e.type,
                e.payload->>'outcome' AS outcome,
                e.payload->>'provider' AS provider,
                to_char(date_trunc('day', e."createdAt"), 'YYYY-MM-DD') AS bucket_date,
                count(*)::int AS value
            FROM "SessionEvents" e
            INNER JOIN "Sessions" s ON s."sessionId" = e."sessionId"
            LEFT JOIN "Admins" a ON a."adminId" = s."userId"
            WHERE s."isBot" = false
              AND a."adminId" IS NULL
              AND s."impersonationReturnSessionId" IS NULL
              AND e."createdAt" >= ${startDateTime}
              AND e."createdAt" < ${endDateTime}
              AND e.type IN (
                'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED',
                'AUTH_EMAIL_OTP_VERIFY_FAILED',
                'AUTH_PASSKEY_SIGN_IN_SUCCEEDED',
                'AUTH_PASSKEY_SIGN_IN_FAILED',
                'AUTH_OAUTH_SIGN_IN_SUCCEEDED',
                'AUTH_OAUTH_SIGN_IN_FAILED',
                'AUTH_OAUTH_ACCOUNT_CREATED',
                'USER_CREATE_SUCCESSFUL'
              )
            GROUP BY e.type, e.payload->>'outcome', e.payload->>'provider', date_trunc('day', e."createdAt")
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const totals: Record<
            GqlSAdminSignInMethod,
            { signInCount: number; registrationTicketCount: number; accountCreatedCount: number; failedCount: number }
        > = {
            EMAIL_OTP: { signInCount: 0, registrationTicketCount: 0, accountCreatedCount: 0, failedCount: 0 },
            PASSKEY: { signInCount: 0, registrationTicketCount: 0, accountCreatedCount: 0, failedCount: 0 },
            GOOGLE: { signInCount: 0, registrationTicketCount: 0, accountCreatedCount: 0, failedCount: 0 },
            FACEBOOK: { signInCount: 0, registrationTicketCount: 0, accountCreatedCount: 0, failedCount: 0 },
        };
        const signInByDay = new Map<string, Record<GqlSAdminSignInMethod, number>>();

        function addSignIn(method: GqlSAdminSignInMethod, date: string, count: number) {
            const day = signInByDay.get(date) ?? { EMAIL_OTP: 0, PASSKEY: 0, GOOGLE: 0, FACEBOOK: 0 };
            day[method] += count;
            signInByDay.set(date, day);
        }

        for (const row of rows) {
            const count = typeof row.value === 'number' ? row.value : Number(row.value);
            if (!Number.isFinite(count)) continue;
            switch (row.type) {
                case 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED':
                    if (row.outcome === 'registration_ticket') {
                        totals.EMAIL_OTP.registrationTicketCount += count;
                    } else {
                        totals.EMAIL_OTP.signInCount += count;
                        addSignIn('EMAIL_OTP', row.bucket_date, count);
                    }
                    break;
                case 'AUTH_EMAIL_OTP_VERIFY_FAILED':
                    totals.EMAIL_OTP.failedCount += count;
                    break;
                case 'AUTH_PASSKEY_SIGN_IN_SUCCEEDED':
                    totals.PASSKEY.signInCount += count;
                    addSignIn('PASSKEY', row.bucket_date, count);
                    break;
                case 'AUTH_PASSKEY_SIGN_IN_FAILED':
                    totals.PASSKEY.failedCount += count;
                    break;
                case 'AUTH_OAUTH_SIGN_IN_SUCCEEDED': {
                    const oauthMethod = oauthSignInMethod(row.provider);
                    if (oauthMethod) {
                        if (row.outcome === 'registration_ticket') {
                            totals[oauthMethod].registrationTicketCount += count;
                        } else {
                            totals[oauthMethod].signInCount += count;
                            addSignIn(oauthMethod, row.bucket_date, count);
                        }
                    }
                    break;
                }
                case 'AUTH_OAUTH_SIGN_IN_FAILED': {
                    const oauthMethod = oauthSignInMethod(row.provider);
                    if (oauthMethod) {
                        totals[oauthMethod].failedCount += count;
                    }
                    break;
                }
                case 'AUTH_OAUTH_ACCOUNT_CREATED': {
                    const oauthMethod = oauthSignInMethod(row.provider);
                    if (oauthMethod) {
                        totals[oauthMethod].accountCreatedCount += count;
                    }
                    break;
                }
                case 'USER_CREATE_SUCCESSFUL':
                    totals.EMAIL_OTP.accountCreatedCount += count;
                    break;
                default:
                    break;
            }
        }

        totals.EMAIL_OTP.accountCreatedCount = Math.max(
            0,
            totals.EMAIL_OTP.accountCreatedCount - totals.GOOGLE.accountCreatedCount - totals.FACEBOOK.accountCreatedCount,
        );

        const buckets: GqlSAdminSignInMethodStats['buckets'] = [];
        const cursor = new Date(`${formatIsoDate(startDateTime)}T00:00:00`);
        const end = new Date(`${formatIsoDate(endDateTime)}T00:00:00`);
        while (cursor < end) {
            const date = formatIsoDate(cursor);
            const day = signInByDay.get(date) ?? { EMAIL_OTP: 0, PASSKEY: 0, GOOGLE: 0, FACEBOOK: 0 };
            for (const method of METHODS) {
                buckets.push({ date, method, signInCount: day[method] });
            }
            cursor.setDate(cursor.getDate() + 1);
        }

        return {
            methods: METHODS.map((method) => ({ method, ...totals[method] })),
            buckets,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
