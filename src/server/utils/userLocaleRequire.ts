import { eq } from 'drizzle-orm';

import type { Locale } from '../../shared/locale';
import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** Load a user's profile locale. Throws when the user row is missing. */
export async function userLocaleRequire(serverRuntime: ServerRuntime, userId: string): Promise<Locale> {
    const [row] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, userId)).limit(1);
    if (row == null) {
        throw new Error(`userLocaleRequire: user ${userId} not found`);
    }
    return row.locale;
}
