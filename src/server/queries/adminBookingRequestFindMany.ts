import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';

import type { ChatAdminBookingRequestListItem } from '../db/chatPayloadTypes';
import { bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequest, GqlSAdminBookingRequestsArgs, GqlSSession } from '../graphql/generated';
import { GqlSBookingRequestPublicationStatusSchema } from '../graphql/generated';
import { adminBookingRequestCriterionWhere } from '../utils/adminBookingRequestCriterionWhere';
import { adminBookingRequestHydrate } from '../utils/adminBookingRequestHydrate';
import { adminBookingRequestOrderBy } from '../utils/adminBookingRequestOrderBy';
import { findManySkip, findManyTake } from '../utils/findManyTake';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TOOL_TAKE_DEFAULT = 25;
const TOOL_TAKE_MAX = 25;
const TOOL_DAYS_MAX = 366;

export async function adminBookingRequestFindMany(
    args: GqlSAdminBookingRequestsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequest[]> {
    try {
        const criterion = args.criterion;
        const where = adminBookingRequestCriterionWhere(criterion, serverRuntime.db);

        const rows = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(where)
            .orderBy(adminBookingRequestOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return adminBookingRequestHydrate(rows, serverRuntime);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

function dateToIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Slim card-ready snapshot for chat `admin.bookingRequestList` data parts. */
async function adminBookingRequestListCardSnapshot(
    requests: GqlSAdminBookingRequest[],
    serverRuntime: ServerRuntime,
): Promise<ChatAdminBookingRequestListItem[]> {
    const cookIds = [...new Set(requests.flatMap((request) => request.offers.map((offer) => offer.cook.cookId)))];
    const cookUsers =
        cookIds.length === 0
            ? []
            : await serverRuntime.db
                  .select({
                      userId: users.userId,
                      firstName: users.firstName,
                      lastName: users.lastName,
                  })
                  .from(users)
                  .where(inArray(users.userId, cookIds));
    const cookUserById = new Map(cookUsers.map((row) => [row.userId, row] as const));

    return requests.map((request) => ({
        bookingRequestId: request.bookingRequestId,
        status: request.status,
        publicationStatus: request.publicationStatus,
        occasion: request.occasion,
        dateTime: dateToIso(request.dateTime),
        createdAt: dateToIso(request.createdAt),
        exactEventAddress: {
            city: request.exactEventAddress.city,
            displayText: request.exactEventAddress.displayText,
        },
        participants: request.participants.map((participant) => ({ type: participant.type })),
        customer: {
            userId: request.customer.userId,
            firstName: request.customer.firstName,
            lastName: request.customer.lastName,
            emailAddress: request.customer.emailAddress ? request.customer.emailAddress : null,
        },
        offers: request.offers.map((offer) => {
            const cookUser = cookUserById.get(offer.cook.cookId);
            return {
                bookingRequestOfferId: offer.bookingRequestOfferId,
                status: offer.status,
                createdAt: dateToIso(offer.createdAt),
                userUnreadNotificationCount: offer.userUnreadNotificationCount,
                cookUnreadNotificationCount: offer.cookUnreadNotificationCount,
                cook: {
                    cookId: offer.cook.cookId,
                    user: {
                        userId: cookUser?.userId ?? offer.cook.cookId,
                        firstName: cookUser?.firstName ?? '',
                        lastName: cookUser?.lastName ?? '',
                    },
                },
            };
        }),
    }));
}

function parseOptionalDateTime(value: string | undefined, field: string): Date | undefined {
    if (value == null || value.length === 0) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`adminBookingRequestsFindMany: invalid ${field}`);
    }
    return parsed;
}

const toolAdminBookingRequestsFindManyInputSchema = z.object({
    bookingRequestIds: z
        .array(z.string())
        .optional()
        .describe('Primary-key filter. Use for follow-up drill-in from prior tool results (typically one id). Do not invent ids.'),
    days: z.coerce
        .number()
        .int()
        .min(1)
        .max(TOOL_DAYS_MAX)
        .optional()
        .describe('Created within the past N calendar days (sets createdAtFrom = now - N days). Prefer this for “past X days”.'),
    createdAtFrom: z.string().optional().describe('ISO DateTime lower bound for BookingRequests.createdAt. Ignored when `days` is set.'),
    createdAtTo: z
        .string()
        .optional()
        .describe('ISO DateTime upper bound for BookingRequests.createdAt. Defaults to now when `days` is set.'),
    searchText: z.string().optional().describe('Optional occasion / message / venue / customer name or email search.'),
    publicationStatuses: z
        .array(GqlSBookingRequestPublicationStatusSchema)
        .optional()
        .describe('Optional publication status filter (e.g. PUBLICATION_BLOCKED_BY_ADMIN_REVIEW).'),
    take: z.coerce
        .number()
        .int()
        .min(1)
        .max(TOOL_TAKE_MAX)
        .optional()
        .describe(`Max rows to return (default ${TOOL_TAKE_DEFAULT}, max ${TOOL_TAKE_MAX}).`),
});

export type ToolAdminBookingRequestsFindManyInput = z.infer<typeof toolAdminBookingRequestsFindManyInputSchema>;

export type ToolAdminBookingRequestsFindManyOutput = {
    count: number;
    createdAtFrom: string | null;
    createdAtTo: string | null;
    requests: ChatAdminBookingRequestListItem[];
};

/** AI-SDK tool — same read path as `Admin.bookingRequests`, card-shaped for chat. */
export function toolAdminBookingRequestsFindMany({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'List admin booking requests matching a criterion.',
            'Use when the operator asks to show / list / find booking requests (especially “past X days”).',
            'Pass `days` for relative recency; optionally narrow with searchText or publicationStatuses.',
            'For a specific known booking request (follow-up drill-in), pass bookingRequestIds from a prior tool result.',
            'After the tool returns, summarize the count briefly in markdown — the UI renders the request cards.',
            'Do not invent booking request ids or details not present in the tool result.',
        ].join(' '),
        inputSchema: toolAdminBookingRequestsFindManyInputSchema,
        async execute(input: ToolAdminBookingRequestsFindManyInput): Promise<ToolAdminBookingRequestsFindManyOutput> {
            const now = new Date();
            let createdAtFrom: Date | undefined;
            let createdAtTo: Date | undefined;

            if (input.days != null) {
                createdAtFrom = new Date(now.getTime() - input.days * MS_PER_DAY);
                createdAtTo = parseOptionalDateTime(input.createdAtTo, 'createdAtTo') ?? now;
            } else {
                createdAtFrom = parseOptionalDateTime(input.createdAtFrom, 'createdAtFrom');
                createdAtTo = parseOptionalDateTime(input.createdAtTo, 'createdAtTo');
            }

            const take = Math.min(Math.max(input.take ?? TOOL_TAKE_DEFAULT, 1), TOOL_TAKE_MAX);
            const rows = await adminBookingRequestFindMany(
                {
                    criterion: {
                        skip: 0,
                        take,
                        bookingRequestIds: input.bookingRequestIds,
                        searchText: input.searchText,
                        publicationStatuses: input.publicationStatuses,
                        createdAtFrom,
                        createdAtTo,
                        sortField: 'createdAt',
                        sortDirection: 'DESC',
                    },
                },
                requestingSession,
                serverRuntime,
            );
            const requests = await adminBookingRequestListCardSnapshot(rows, serverRuntime);
            return {
                count: requests.length,
                createdAtFrom: createdAtFrom?.toISOString() ?? null,
                createdAtTo: createdAtTo?.toISOString() ?? null,
                requests,
            };
        },
    });
}
