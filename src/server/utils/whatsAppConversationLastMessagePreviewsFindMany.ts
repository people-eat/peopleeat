import { desc, inArray } from 'drizzle-orm';

import { whatsAppMessages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** Latest message body per conversation (PostgreSQL `DISTINCT ON`). */
export async function whatsAppConversationLastMessagePreviewsFindMany(
    db: ServerRuntime['db'],
    whatsAppConversationIds: readonly string[],
): Promise<Map<string, string>> {
    const previews = new Map<string, string>();
    if (whatsAppConversationIds.length === 0) {
        return previews;
    }

    const rows = await db
        .selectDistinctOn([whatsAppMessages.whatsAppConversationId], {
            whatsAppConversationId: whatsAppMessages.whatsAppConversationId,
            body: whatsAppMessages.body,
        })
        .from(whatsAppMessages)
        .where(inArray(whatsAppMessages.whatsAppConversationId, [...whatsAppConversationIds]))
        .orderBy(whatsAppMessages.whatsAppConversationId, desc(whatsAppMessages.createdAt));

    for (const row of rows) {
        previews.set(row.whatsAppConversationId, row.body.trim());
    }
    return previews;
}
