import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { users, whatsAppConversations } from '../db/schema';

/**
 * Admin join: prefer `WhatsAppConversations.userId`, else match `Users.phoneNumber`
 * to the conversation phone with or without a leading `+` (Meta / migration form).
 */
export function whatsappConversationUserJoinOn(): SQL {
    return sql`(
        ${users.userId} = ${whatsAppConversations.userId}
        OR (
            ${whatsAppConversations.userId} IS NULL
            AND ${users.phoneNumber} IS NOT NULL
            AND regexp_replace(${users.phoneNumber}, '^\\+', '')
                = regexp_replace(${whatsAppConversations.phoneNumber}, '^\\+', '')
        )
    )`;
}
