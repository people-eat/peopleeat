import { tool } from 'ai';
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';

import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { ChatAdminMenuListItem } from '../db/chatPayloadTypes';
import { meals, menuCourseMealOptions, menuCourses, menus, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookMenu, GqlSAdminCookMenusArgs, GqlSSession } from '../graphql/generated';
import { GqlSAdminCookInventoryStatusSchema } from '../graphql/generated';
import { toGqlAdminCookMenu } from '../mappers/toGqlAdminCookMenu';
import { adminCookMenuCriterionWhere, adminCookMenuOrderBy } from '../utils/adminCookMenuCriterionWhere';
import { findManySkip, findManyTake } from '../utils/findManyTake';

const TOOL_TAKE_DEFAULT = 25;
const TOOL_TAKE_MAX = 25;

export async function adminCookMenuFindMany(
    args: GqlSAdminCookMenusArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookMenu[]> {
    try {
        const criterion = args.criterion;
        const where = adminCookMenuCriterionWhere(criterion);

        const rows = await serverRuntime.db
            .select({
                menu: menus,
                cookFirstName: users.firstName,
                cookLastName: users.lastName,
            })
            .from(menus)
            .innerJoin(users, eq(users.userId, menus.cookId))
            .where(where)
            .orderBy(adminCookMenuOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        if (rows.length === 0) return [];

        const menuIds = rows.map((row) => row.menu.menuId);
        const courseCountRows = await serverRuntime.db
            .select({
                menuId: menuCourses.menuId,
                courseCount: sql<number>`cast(count(*) as int)`,
            })
            .from(menuCourses)
            .where(inArray(menuCourses.menuId, menuIds))
            .groupBy(menuCourses.menuId);

        const courseCountByMenuId = new Map(courseCountRows.map((row) => [row.menuId, row.courseCount]));

        const imageRows = await serverRuntime.db
            .select({
                menuId: menuCourses.menuId,
                imageFileUploadId: meals.imageFileUploadId,
            })
            .from(menuCourses)
            .innerJoin(menuCourseMealOptions, eq(menuCourseMealOptions.courseId, menuCourses.courseId))
            .innerJoin(meals, eq(meals.mealId, menuCourseMealOptions.mealId))
            .where(and(inArray(menuCourses.menuId, menuIds), isNull(meals.deletedAt), isNotNull(meals.imageFileUploadId)))
            .orderBy(asc(menuCourses.index), asc(menuCourseMealOptions.index));

        const imagesByMenuId = new Map<string, string[]>();
        for (const row of imageRows) {
            if (row.imageFileUploadId == null) continue;
            const url = fileUploadPublicUrl(row.imageFileUploadId);
            const list = imagesByMenuId.get(row.menuId) ?? [];
            if (list.includes(url)) continue;
            list.push(url);
            imagesByMenuId.set(row.menuId, list);
        }

        return rows.map((row) =>
            toGqlAdminCookMenu(
                row.menu,
                `${row.cookFirstName} ${row.cookLastName}`.trim(),
                courseCountByMenuId.get(row.menu.menuId) ?? 0,
                imagesByMenuId.get(row.menu.menuId) ?? [],
            ),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

function dateToIso(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function adminCookMenuListCardSnapshot(rows: GqlSAdminCookMenu[]): ChatAdminMenuListItem[] {
    return rows.map((menu) => ({
        menuId: menu.menuId,
        cookId: menu.cookId,
        cookName: menu.cookName,
        title: menu.title,
        description: menu.description,
        courseCount: menu.courseCount,
        courseMealOptionImages: [...menu.courseMealOptionImages],
        publishedAt: dateToIso(menu.publishedAt),
        deletedAt: dateToIso(menu.deletedAt),
        createdAt: dateToIso(menu.createdAt) ?? new Date(0).toISOString(),
    }));
}

const toolAdminCookMenusFindManyInputSchema = z.object({
    menuIds: z
        .array(z.string())
        .optional()
        .describe('Primary-key filter. Use for follow-up drill-in from prior tool results (typically one id). Do not invent ids.'),
    searchText: z.string().optional().describe('Optional title, description, or cook name search.'),
    cookIds: z.array(z.string()).optional().describe('Optional cook user ids to scope the list.'),
    status: GqlSAdminCookInventoryStatusSchema.optional().describe('Optional lifecycle filter (PUBLISHED / DRAFT / DELETED).'),
    includeDeleted: z.boolean().optional().describe('Include soft-deleted menus (default true; ignored when status is set).'),
    take: z.coerce
        .number()
        .int()
        .min(1)
        .max(TOOL_TAKE_MAX)
        .optional()
        .describe(`Max rows to return (default ${TOOL_TAKE_DEFAULT}, max ${TOOL_TAKE_MAX}).`),
});

export type ToolAdminCookMenusFindManyInput = z.infer<typeof toolAdminCookMenusFindManyInputSchema>;

export type ToolAdminCookMenusFindManyOutput = {
    count: number;
    menus: ChatAdminMenuListItem[];
};

/** AI-SDK tool — same read path as `Admin.cookMenus`, card-shaped for chat. */
export function toolAdminCookMenusFindMany({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'List admin cook menus matching a criterion (inventory only, not offer copies).',
            'Use when the operator asks to show / list / find menus.',
            'Optionally narrow with searchText, cookIds, or status.',
            'For a specific known menu (follow-up drill-in), pass menuIds from a prior tool result.',
            'After the tool returns, summarize the count briefly in markdown — the UI renders the menu cards.',
            'Do not invent menu ids or details not present in the tool result.',
        ].join(' '),
        inputSchema: toolAdminCookMenusFindManyInputSchema,
        async execute(input: ToolAdminCookMenusFindManyInput): Promise<ToolAdminCookMenusFindManyOutput> {
            const take = Math.min(Math.max(input.take ?? TOOL_TAKE_DEFAULT, 1), TOOL_TAKE_MAX);
            const rows = await adminCookMenuFindMany(
                {
                    criterion: {
                        skip: 0,
                        take,
                        menuIds: input.menuIds,
                        searchText: input.searchText,
                        cookIds: input.cookIds,
                        status: input.status,
                        includeDeleted: input.includeDeleted ?? true,
                        sortField: 'createdAt',
                        sortDirection: 'DESC',
                    },
                },
                requestingSession,
                serverRuntime,
            );
            const menuCards = adminCookMenuListCardSnapshot(rows);
            return { count: menuCards.length, menus: menuCards };
        },
    });
}
