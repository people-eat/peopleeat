import { and, count, eq, gt, lt, sql } from 'drizzle-orm';

import type { Database, DatabaseTransaction } from '../db';
import { authEmailOtps } from '../db/schema';

const AUTH_EMAIL_OTP_MAX_ATTEMPTS = 5;
const AUTH_EMAIL_OTP_ISSUED_CAP = 5;
const AUTH_EMAIL_OTP_ISSUED_WINDOW_MS = 60 * 60 * 1000;

type OtpDb = Database | DatabaseTransaction;

// One statement so parallel verifies cannot all pass a read of attemptCount.
// Returns false when the row is already at the cap.
export async function authEmailOtpAttemptTake(db: OtpDb, authEmailOtpId: string): Promise<boolean> {
    const [row] = await db
        .update(authEmailOtps)
        .set({ attemptCount: sql`${authEmailOtps.attemptCount} + 1` })
        .where(and(eq(authEmailOtps.authEmailOtpId, authEmailOtpId), lt(authEmailOtps.attemptCount, AUTH_EMAIL_OTP_MAX_ATTEMPTS)))
        .returning({ authEmailOtpId: authEmailOtps.authEmailOtpId });
    return Boolean(row);
}

// Newly issued codes for one address, across sessions. A repeat send of an
// existing row does not count. Stops a caller from minting a fresh session to get a new code.
export async function authEmailOtpIssueCapReached(db: OtpDb, emailAddress: string, now: Date): Promise<boolean> {
    const since = new Date(now.getTime() - AUTH_EMAIL_OTP_ISSUED_WINDOW_MS);
    const [row] = await db
        .select({ value: count() })
        .from(authEmailOtps)
        .where(and(eq(authEmailOtps.emailAddress, emailAddress), gt(authEmailOtps.createdAt, since)));
    return Number(row?.value ?? 0) >= AUTH_EMAIL_OTP_ISSUED_CAP;
}
