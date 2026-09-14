import { and, eq, exists, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { chats, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAssistantChatCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminAssistantChatFindMany` / `adminAssistantChatsCounts`.
 * Always requires non-null `userId` + `surface` (owned assistant chats only). */
export function adminAssistantChatCriterionWhere(
    criterion: Pick<GqlSAdminAssistantChatCriterion, 'searchText' | 'userIds' | 'surface'>,
    db: ServerRuntime['db'],
): SQL {
    const parts: SQL[] = [isNotNull(chats.userId), isNotNull(chats.surface)];

    if (criterion.userIds && criterion.userIds.length > 0) {
        parts.push(inArray(chats.userId, criterion.userIds));
    }

    if (criterion.surface) {
        parts.push(eq(chats.surface, criterion.surface));
    }

    const pattern = likeContainsPattern(criterion.searchText);
    if (pattern) {
        parts.push(
            or(
                ilike(chats.title, pattern),
                ilike(sql`(${chats.chatId})::text`, pattern),
                exists(
                    db
                        .select({ userId: users.userId })
                        .from(users)
                        .where(
                            and(
                                eq(users.userId, chats.userId),
                                or(ilike(users.emailAddress, pattern), ilike(users.firstName, pattern), ilike(users.lastName, pattern)),
                            ),
                        ),
                ),
            )!,
        );
    }

    return and(...parts)!;
}
