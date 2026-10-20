import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { userDisplayName } from '../../shared';
import { adminListDetailField, adminListToolOutputToModelResult, resolveAdminListDetail } from '../agents/adminListToolDetail';
import type { ChatAdminSupportRequestListItem } from '../db/chatPayloadTypes';
import { bookingRequests, supportRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSupportRequest, GqlSAdminSupportRequestsArgs, GqlSSession } from '../graphql/generated';
import { GqlSAdminSupportRequestSortFieldSchema, GqlSSupportRequestStatusSchema } from '../graphql/generated';
import { toGqlAdminSupportRequest } from '../mappers/toGqlAdminSupportRequest';
import { toGqlAdminUser } from '../mappers/toGqlAdminUser';
import { adminSupportRequestCriterionWhere } from '../utils/adminSupportRequestCriterionWhere';
import { adminSupportRequestOrderBy } from '../utils/adminSupportRequestOrderBy';
import { adminUserTypesByUserIdFindMany } from '../utils/adminUserTypesByUserIdFindMany';
import { findManySkip, findManyTake } from '../utils/findManyTake';
import { supportRequestBookingSummariesById } from '../utils/supportRequestBookingSummariesById';

const TOOL_TAKE_DEFAULT = 25;
const TOOL_TAKE_MAX = 25;

export async function adminSupportRequestFindMany(
    args: GqlSAdminSupportRequestsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSupportRequest[]> {
    try {
        const criterion = args.criterion;
        const where = adminSupportRequestCriterionWhere(criterion);

        const joined = await serverRuntime.db
            .select({
                supportRequest: supportRequests,
                user: users,
            })
            .from(supportRequests)
            .innerJoin(users, eq(users.userId, supportRequests.userId))
            .leftJoin(bookingRequests, eq(bookingRequests.bookingRequestId, supportRequests.bookingRequestId))
            .where(where)
            .orderBy(...adminSupportRequestOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        const typesByUserId = await adminUserTypesByUserIdFindMany(
            joined.map((row) => row.user.userId),
            serverRuntime.db,
        );
        const bookingById = await supportRequestBookingSummariesById(
            joined.map((row) => row.supportRequest),
            serverRuntime,
        );

        return joined.map(({ supportRequest, user }) =>
            toGqlAdminSupportRequest(
                supportRequest,
                toGqlAdminUser(user, typesByUserId.get(user.userId) ?? ['customer']),
                supportRequest.bookingRequestId ? (bookingById.get(supportRequest.bookingRequestId) ?? null) : null,
            ),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

function dateToIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function adminSupportRequestListCardSnapshot(rows: GqlSAdminSupportRequest[]): ChatAdminSupportRequestListItem[] {
    return rows.map((request) => ({
        supportRequestId: request.supportRequestId,
        subject: request.subject,
        status: request.status,
        adminUnreadNotificationCount: request.adminUnreadNotificationCount,
        createdAt: dateToIso(request.createdAt),
        customerName: userDisplayName(request.customer),
        bookingRequest: request.bookingRequest
            ? {
                  bookingRequestId: request.bookingRequest.bookingRequestId,
                  occasion: request.bookingRequest.occasion,
                  dateTime: dateToIso(request.bookingRequest.dateTime),
              }
            : null,
    }));
}

const toolAdminSupportRequestsFindManyInputSchema = z.object({
    supportRequestIds: z
        .array(z.string())
        .optional()
        .describe('Primary-key filter. Use for follow-up drill-in from prior tool results (typically one id). Do not invent ids.'),
    searchText: z.string().optional().describe('Optional subject / supportRequestId / userId search.'),
    statuses: z.array(GqlSSupportRequestStatusSchema).optional().describe('Optional status filter (OPEN / RESOLVED).'),
    hasAdminUnread: z.boolean().optional().describe('When true, only rows with admin unread messages.'),
    sortField: GqlSAdminSupportRequestSortFieldSchema.optional().describe(
        'Sort: lastMessageAt (default, newest activity), createdAt, or bookingDateTime (soonest booking).',
    ),
    unreadFirst: z.boolean().optional().describe('When true (default), admin-unread rows come before others within the chosen sort.'),
    take: z.coerce
        .number()
        .int()
        .min(1)
        .max(TOOL_TAKE_MAX)
        .optional()
        .describe(`Max rows to return (default ${TOOL_TAKE_DEFAULT}, max ${TOOL_TAKE_MAX}).`),
    detail: adminListDetailField(),
});

export type ToolAdminSupportRequestsFindManyInput = z.infer<typeof toolAdminSupportRequestsFindManyInputSchema>;

export type ToolAdminSupportRequestsFindManyOutput = {
    count: number;
    detail: 'summary' | 'evidence';
    supportRequestIds: string[];
    supportRequests: ChatAdminSupportRequestListItem[];
};

/** AI-SDK tool — same read path as `Admin.supportRequests`, card-shaped for chat. */
export function toolAdminSupportRequestsFindMany({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'List admin support requests matching a criterion.',
            'Use when the operator asks to show / list / find support tickets or support requests.',
            'Optionally narrow with searchText, statuses, or hasAdminUnread.',
            'Optional sortField (lastMessageAt default, createdAt, bookingDateTime) and unreadFirst (default true).',
            'For a specific known support request (follow-up drill-in), pass supportRequestIds from a prior tool result.',
            'Default detail is summary (count + ids for the model; UI still shows cards). Pass detail=evidence when you need row fields.',
            'After the tool returns, summarize the count briefly in markdown — the UI renders the request cards.',
            'Do not invent support request ids or details not present in the tool result.',
        ].join(' '),
        inputSchema: toolAdminSupportRequestsFindManyInputSchema,
        toModelOutput: ({ input, output }) => adminListToolOutputToModelResult(output, input.detail),
        async execute(input: ToolAdminSupportRequestsFindManyInput): Promise<ToolAdminSupportRequestsFindManyOutput> {
            const take = Math.min(Math.max(input.take ?? TOOL_TAKE_DEFAULT, 1), TOOL_TAKE_MAX);
            const detail = resolveAdminListDetail(input.detail);
            const rows = await adminSupportRequestFindMany(
                {
                    criterion: {
                        skip: 0,
                        take,
                        supportRequestIds: input.supportRequestIds,
                        searchText: input.searchText,
                        statuses: input.statuses,
                        hasAdminUnread: input.hasAdminUnread,
                        sortField: input.sortField,
                        unreadFirst: input.unreadFirst,
                    },
                },
                requestingSession,
                serverRuntime,
            );
            const supportRequestCards = adminSupportRequestListCardSnapshot(rows);
            return {
                count: supportRequestCards.length,
                detail,
                supportRequestIds: supportRequestCards.map((request) => request.supportRequestId),
                supportRequests: supportRequestCards,
            };
        },
    });
}
