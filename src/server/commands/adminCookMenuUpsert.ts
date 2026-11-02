import { tool } from 'ai';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { cookMenuDefaultCourseTitles, cookMenuDraftTitle, DEFAULT_LOCALE } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { MenuCourseCreate, MenuCourseMealOptionCreate, MenuCreate } from '../db/schema';
import { menuCourseMealOptions, menuCourses, menus, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSCookMenuCourseInputSchema } from '../graphql/generated';
import type {
    GqlSAdminCookMenuUpsert,
    GqlSAdminMutation,
    GqlSAdminMutationCookMenuUpsertArgs,
    GqlSCookMenuCourseInput,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookMenuMealIdsAssertOwned } from '../utils/cookMenuHydrate';
import { menuCoursePayloadsBuild } from '../utils/menuCoursePayloadsBuild';

function publishedAtParse(value: Date | string | null | undefined, commandName: string): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${commandName}: publishedAt is invalid`);
    }
    return date;
}

async function adminCookMenuInsert(
    menu: GqlSAdminCookMenuUpsert,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const cookId = menu.cookId?.trim() ?? '';
    if (cookId.length === 0) {
        throw new Error('adminCookMenuUpsert: cookId is required when creating');
    }

    const [cookUser] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, cookId)).limit(1);
    const locale: Locale = cookUser?.locale === 'en' ? 'en' : DEFAULT_LOCALE;

    const hasTitle = menu.title !== undefined && menu.title !== null;
    const hasDescription = menu.description !== undefined && menu.description !== null;
    const hasPublishedAt = menu.publishedAt !== undefined;
    const hasCourses = menu.courses !== undefined && menu.courses !== null;

    const titled = hasTitle ? textNormalizeTitled(menu.title!) : '';
    const title = titled.length > 0 ? titled : cookMenuDraftTitle(locale);
    const description = hasDescription ? textNormalizeProseTitled(menu.description!) : '';
    const publishedAt = hasPublishedAt ? (publishedAtParse(menu.publishedAt, 'adminCookMenuUpsert') ?? null) : null;

    const menuId = idCreate();
    const menuInsert: MenuCreate = {
        menuId,
        cookId,
        title,
        description,
        publishedAt,
        deletedAt: null,
    };

    let courseInserts: MenuCourseCreate[];
    let optionInserts: MenuCourseMealOptionCreate[] = [];

    if (hasCourses) {
        const mealIds = menu.courses!.flatMap((course) => course.mealIds);
        await cookMenuMealIdsAssertOwned(serverRuntime.db, cookId, mealIds, 'adminCookMenuUpsert');
        ({ courseInserts, optionInserts } = menuCoursePayloadsBuild(cookId, menuId, menu.courses!, 'adminCookMenuUpsert'));
    } else {
        courseInserts = cookMenuDefaultCourseTitles(locale).map((courseTitle, index) => ({
            courseId: idCreate(),
            menuId,
            cookId,
            index,
            title: courseTitle,
            mealSelectionLimit: null,
        }));
    }

    try {
        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(menus).values(menuInsert);
            await transaction.insert(menuCourses).values(courseInserts);
            if (optionInserts.length > 0) {
                await transaction.insert(menuCourseMealOptions).values(optionInserts);
            }
        });
        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

async function adminCookMenuPatch(
    menuId: string,
    menu: GqlSAdminCookMenuUpsert,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const hasTitle = menu.title !== undefined && menu.title !== null;
        const hasDescription = menu.description !== undefined && menu.description !== null;
        const hasPublishedAt = menu.publishedAt !== undefined;
        const hasCourses = menu.courses !== undefined && menu.courses !== null;

        if (!hasTitle && !hasDescription && !hasPublishedAt && !hasCourses) {
            throw new Error('adminCookMenuUpsert: at least one field is required');
        }

        const [existing] = await serverRuntime.db
            .select({
                menuId: menus.menuId,
                cookId: menus.cookId,
                bookingRequestOfferId: menus.bookingRequestOfferId,
            })
            .from(menus)
            .where(and(eq(menus.menuId, menuId), isNull(menus.deletedAt)))
            .limit(1);

        if (!existing) {
            throw new Error('adminCookMenuUpsert: menu not found');
        }

        if (menu.cookId != null && menu.cookId !== '' && menu.cookId !== existing.cookId) {
            throw new Error('adminCookMenuUpsert: cookId does not match menu owner');
        }

        const { cookId } = existing;
        const isOfferScoped = existing.bookingRequestOfferId != null;

        if (isOfferScoped && hasPublishedAt) {
            throw new Error('adminCookMenuUpsert: publishedAt is inventory-only');
        }

        const set: {
            title?: string;
            description?: string;
            publishedAt?: Date | null;
            updatedAt: Date;
        } = { updatedAt: new Date() };

        if (hasTitle) {
            const title = textNormalizeTitled(menu.title!);
            if (title.length === 0) {
                throw new Error('adminCookMenuUpsert: title must not be empty');
            }
            set.title = title;
        }

        if (hasDescription) {
            set.description = textNormalizeProseTitled(menu.description!);
        }

        if (hasPublishedAt) {
            set.publishedAt = publishedAtParse(menu.publishedAt, 'adminCookMenuUpsert') ?? null;
        }

        let courseInserts: MenuCourseCreate[] | undefined;
        let optionInserts: MenuCourseMealOptionCreate[] | undefined;

        if (hasCourses) {
            const mealIds = menu.courses!.flatMap((course) => course.mealIds);
            await cookMenuMealIdsAssertOwned(serverRuntime.db, cookId, mealIds, 'adminCookMenuUpsert');
            ({ courseInserts, optionInserts } = menuCoursePayloadsBuild(cookId, menuId, menu.courses!, 'adminCookMenuUpsert'));
        }

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(menus)
                .set(set)
                .where(and(eq(menus.menuId, menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt)))
                .returning({ menuId: menus.menuId });

            if (updated.length === 0) {
                throw new Error('adminCookMenuUpsert: menu not found');
            }

            if (courseInserts != null && optionInserts != null) {
                await transaction.delete(menuCourses).where(and(eq(menuCourses.menuId, menuId), eq(menuCourses.cookId, cookId)));
                await transaction.insert(menuCourses).values(courseInserts);
                if (optionInserts.length > 0) {
                    await transaction.insert(menuCourseMealOptions).values(optionInserts);
                }
            }
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

export async function adminCookMenuUpsert(
    { adminId }: GqlSAdminMutation,
    { menu }: GqlSAdminMutationCookMenuUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const menuId = menu.menuId ?? null;
    if (menuId == null || menuId === '') {
        return adminCookMenuInsert(menu, requestingSession, serverRuntime);
    }
    return adminCookMenuPatch(menuId, menu, requestingSession, serverRuntime);
}

// Hand-built: GraphQL DateTime → z.date() breaks Gemini structuredOutputs.
// See docs/architecture/agent-delegation.md#tool-input-schemas.
const adminCookMenuUpsertToolSchema = z.object({
    menuId: z
        .string()
        .nullish()
        .describe(
            'Existing menu id when editing (inventory or offer copy). Omit to create an inventory draft. Pass an id from adminCookMenusFindMany — never invent one.',
        ),
    cookId: z
        .string()
        .nullish()
        .describe('Target cook user id. Required when creating. On update, optional; must match the menu owner when set.'),
    title: z.string().nullish().describe('Menu title. On create, blank/omit uses a locale draft placeholder.'),
    description: z.string().nullish().describe('Menu description.'),
    publishedAt: z
        .string()
        .nullish()
        .describe('ISO-8601 timestamp to publish inventory menus, or null to unpublish. Rejected on offer-scoped copies.'),
    courses: z
        .array(GqlSCookMenuCourseInputSchema())
        .nullish()
        .describe('Full course tree replacement when set. On create without courses, three empty default courses are seeded.'),
});

/** AI-SDK tool — same write path as `AdminMutation.cookMenuUpsert`. */
export function toolAdminCookMenuUpsert({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'Create or update a menu on any cook inventory, or patch an offer-scoped copy (admin).',
            'Omit menuId and pass cookId to create; pass menuId from a list tool to edit.',
            'Creating with title/description/courses materializes a full menu in one call; empty create seeds default courses.',
            'publishedAt is inventory-only.',
        ].join(' '),
        inputSchema: adminCookMenuUpsertToolSchema as never,
        async execute(input: z.infer<typeof adminCookMenuUpsertToolSchema>) {
            const adminId = requestingSession.userId;
            if (!adminId) {
                throw new Error('toolAdminCookMenuUpsert requires a signed-in admin');
            }
            const menu: GqlSAdminCookMenuUpsert = {
                menuId: input.menuId ?? undefined,
                cookId: input.cookId ?? undefined,
                title: input.title ?? undefined,
                description: input.description ?? undefined,
                publishedAt: input.publishedAt === undefined ? undefined : input.publishedAt === null ? null : new Date(input.publishedAt),
                courses: (input.courses ?? undefined) as GqlSCookMenuCourseInput[] | undefined,
            };
            const result = await adminCookMenuUpsert({ adminId } as GqlSAdminMutation, { menu }, requestingSession, serverRuntime);
            return {
                success: result.success,
                menuId: result.referenceId,
                created: menu.menuId == null || menu.menuId === '',
            };
        },
    });
}
