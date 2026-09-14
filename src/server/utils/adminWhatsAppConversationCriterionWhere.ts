import { and, eq, gt, ilike, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { users, whatsAppConversations } from '../db/schema';
import type { GqlSAdminWhatsAppConversationCriterion } from '../graphql/generated';

export function adminWhatsAppConversationCriterionWhere(criterion: GqlSAdminWhatsAppConversationCriterion): SQL | undefined {
    const parts: SQL[] = [];

    if (criterion.hasAdminUnread === true) {
        parts.push(gt(whatsAppConversations.adminUnreadCount, 0));
    }

    if (criterion.userId) {
        parts.push(
            or(
                eq(whatsAppConversations.userId, criterion.userId),
                sql`(
                    ${whatsAppConversations.userId} IS NULL
                    AND regexp_replace(${whatsAppConversations.phoneNumber}, '^\\+', '') = (
                        SELECT regexp_replace(u."phoneNumber", '^\\+', '')
                        FROM "Users" u
                        WHERE u."userId" = ${criterion.userId}
                          AND u."phoneNumber" IS NOT NULL
                    )
                )`,
            )!,
        );
    }

    const searchText = criterion.searchText?.trim();
    if (searchText) {
        const pattern = `%${searchText}%`;
        parts.push(
            or(
                ilike(whatsAppConversations.phoneNumber, pattern),
                ilike(whatsAppConversations.displayName, pattern),
                ilike(whatsAppConversations.whatsAppConversationId, pattern),
                ilike(users.firstName, pattern),
                ilike(users.lastName, pattern),
                ilike(users.emailAddress, pattern),
            )!,
        );
    }

    if (parts.length === 0) {
        return undefined;
    }
    return and(...parts);
}
