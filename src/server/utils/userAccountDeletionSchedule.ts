import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { userAccountDeletionApply } from '../jobs/handlers/userAccountDeletionApply';
import { userAccountDeletionJobCancel } from './userAccountDeletionJobCancel';
import { userAccountDeletionScheduledForResolve, userLastDualAcceptedEventDateTimeFind } from './userDualAcceptedEventCoolOff';

/**
 * Sets `Users.accountDeletionScheduledFor`, cancels prior jobs, enqueues apply
 * at the resolved time. Returns the scheduled datetime.
 */
export async function userAccountDeletionSchedule(userId: string, serverRuntime: ServerRuntime): Promise<Date> {
    const now = new Date();
    const lastEvent = await userLastDualAcceptedEventDateTimeFind(userId, serverRuntime);
    const scheduledFor = userAccountDeletionScheduledForResolve(now, lastEvent);

    await userAccountDeletionJobCancel(serverRuntime, userId);
    await serverRuntime.db.update(users).set({ accountDeletionScheduledFor: scheduledFor }).where(eq(users.userId, userId));
    await serverRuntime.jobs.enqueue(userAccountDeletionApply, { userId }, { startAfter: scheduledFor });

    return scheduledFor;
}

/** Clears the schedule column and cancels the queued job. */
export async function userAccountDeletionScheduleClear(userId: string, serverRuntime: ServerRuntime): Promise<void> {
    await userAccountDeletionJobCancel(serverRuntime, userId);
    await serverRuntime.db.update(users).set({ accountDeletionScheduledFor: null }).where(eq(users.userId, userId));
}
