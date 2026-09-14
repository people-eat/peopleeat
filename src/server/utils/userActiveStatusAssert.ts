import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** Throws when the account is missing or not ACTIVE (banned / anonymized). */
export async function userActiveStatusAssert(userId: string, serverRuntime: ServerRuntime, commandName: string): Promise<void> {
    const [user] = await serverRuntime.db.select({ status: users.status }).from(users).where(eq(users.userId, userId)).limit(1);
    if (!user) {
        throw new Error(`${commandName}: user not found`);
    }
    if (user.status !== 'ACTIVE') {
        throw new Error(`${commandName}: user is not active`);
    }
}
