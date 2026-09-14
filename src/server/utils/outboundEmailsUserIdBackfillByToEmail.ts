import { and, eq, isNull } from 'drizzle-orm';

import type { Database, DatabaseTransaction } from '../db';
import { outboundEmails } from '../db/schema';

/** Stamp `userId` on outbound rows that were sent to this address before an account existed. */
export async function outboundEmailsUserIdBackfillByToEmail(
    dbOrTx: Database | DatabaseTransaction,
    args: { toEmail: string; userId: string },
): Promise<void> {
    await dbOrTx
        .update(outboundEmails)
        .set({ userId: args.userId })
        .where(and(eq(outboundEmails.toEmail, args.toEmail), isNull(outboundEmails.userId)));
}
