import { tool } from 'ai';
import { z } from 'zod';

import type { ChatAdminUserListItem } from '../db/chatPayloadTypes';
import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUser, GqlSAdminUsersArgs, GqlSSession } from '../graphql/generated';
import { GqlSAdminUserTypeSchema, GqlSUserStatusSchema } from '../graphql/generated';
import { toGqlAdminUser } from '../mappers/toGqlAdminUser';
import { adminUserCriterionWhere } from '../utils/adminUserCriterionWhere';
import { adminUserOrderBy } from '../utils/adminUserOrderBy';
import { adminUserTypesByUserIdFindMany } from '../utils/adminUserTypesByUserIdFindMany';
import { findManySkip, findManyTake } from '../utils/findManyTake';

const TOOL_TAKE_DEFAULT = 25;
const TOOL_TAKE_MAX = 25;
const ALL_ADMIN_USER_TYPES = ['customer', 'cook', 'admin'] as const;

export async function adminUserFindMany(
    args: GqlSAdminUsersArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminUser[]> {
    try {
        const criterion = args.criterion;
        const where = adminUserCriterionWhere(criterion, serverRuntime.db);
        if (where === false) {
            return [];
        }

        const rows = await serverRuntime.db
            .select()
            .from(users)
            .where(where)
            .orderBy(adminUserOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        const typesByUserId = await adminUserTypesByUserIdFindMany(
            rows.map((row) => row.userId),
            serverRuntime.db,
        );

        return rows.map((row) => toGqlAdminUser(row, typesByUserId.get(row.userId) ?? ['customer']));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

function dateToIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function adminUserListCardSnapshot(rows: GqlSAdminUser[]): ChatAdminUserListItem[] {
    return rows.map((user) => ({
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress ? user.emailAddress : null,
        status: user.status,
        types: [...user.types],
        createdAt: dateToIso(user.createdAt),
    }));
}

const toolAdminUsersFindManyInputSchema = z.object({
    searchText: z.string().optional().describe('Optional name or email search (case-insensitive contains).'),
    types: z.array(GqlSAdminUserTypeSchema).optional().describe('Membership filter. Omit to include customer, cook, and admin.'),
    status: GqlSUserStatusSchema.optional().describe('Optional account status filter (ACTIVE / BANNED / ANONYMIZED).'),
    isApprovedByAdmin: z
        .boolean()
        .optional()
        .describe('When set with cook types, filter by cook admin-approval flag (e.g. false for unapproved cooks).'),
    take: z.coerce
        .number()
        .int()
        .min(1)
        .max(TOOL_TAKE_MAX)
        .optional()
        .describe(`Max rows to return (default ${TOOL_TAKE_DEFAULT}, max ${TOOL_TAKE_MAX}).`),
});

export type ToolAdminUsersFindManyInput = z.infer<typeof toolAdminUsersFindManyInputSchema>;

export type ToolAdminUsersFindManyOutput = {
    count: number;
    users: ChatAdminUserListItem[];
};

/** AI-SDK tool — same read path as `Admin.users`, card-shaped for chat. */
export function toolAdminUsersFindMany({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'List admin users matching a criterion.',
            'Use when the operator asks to show / list / find users, customers, cooks, or admins.',
            'Optionally narrow with searchText, types, status, or isApprovedByAdmin.',
            'After the tool returns, summarize the count briefly in markdown — the UI renders the user cards.',
            'Do not invent user ids or details not present in the tool result.',
        ].join(' '),
        inputSchema: toolAdminUsersFindManyInputSchema,
        async execute(input: ToolAdminUsersFindManyInput): Promise<ToolAdminUsersFindManyOutput> {
            const take = Math.min(Math.max(input.take ?? TOOL_TAKE_DEFAULT, 1), TOOL_TAKE_MAX);
            const types = input.types != null && input.types.length > 0 ? input.types : [...ALL_ADMIN_USER_TYPES];
            const rows = await adminUserFindMany(
                {
                    criterion: {
                        skip: 0,
                        take,
                        searchText: input.searchText,
                        types,
                        status: input.status,
                        isApprovedByAdmin: input.isApprovedByAdmin,
                        sortField: 'createdAt',
                        sortDirection: 'DESC',
                    },
                },
                requestingSession,
                serverRuntime,
            );
            const userCards = adminUserListCardSnapshot(rows);
            return { count: userCards.length, users: userCards };
        },
    });
}
