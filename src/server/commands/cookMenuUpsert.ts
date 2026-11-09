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
    GqlSCookMenuCourseInput,
    GqlSCookMenuUpsert,
    GqlSCookMutation,
    GqlSCookMutationMenuUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookMenuMealIdsAssertOwned } from '../utils/cookMenuHydrate';
import { cookMenuOfferContextsLoad } from '../utils/cookMenuOfferContextsLoad';
import { menuCoursePayloadsBuild } from '../utils/menuCoursePayloadsBuild';

const OFFER_MENU_NEGOTIABLE_STATUSES = new Set(['USER_NEEDS_TO_ACCEPT', 'COOK_NEEDS_TO_ACCEPT']);

function publishedAtParse(value: Date | string | null | undefined, commandName: string): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${commandName}: publishedAt is invalid`);
    }
    return date;
}

async function cookMenuInsert(
    cookId: string,
    menu: GqlSCookMenuUpsert | null | undefined,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const [cookUser] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, cookId)).limit(1);
    const locale: Locale = cookUser?.locale === 'en' ? 'en' : DEFAULT_LOCALE;

    const hasTitle = menu?.title !== undefined && menu.title !== null;
    const hasDescription = menu?.description !== undefined && menu.description !== null;
    const hasPublishedAt = menu?.publishedAt !== undefined;
    const hasCourses = menu?.courses !== undefined && menu.courses !== null;

    const titled = hasTitle ? textNormalizeTitled(menu.title!) : '';
    const title = titled.length > 0 ? titled : cookMenuDraftTitle(locale);
    const description = hasDescription ? textNormalizeProseTitled(menu.description!) : '';
    const publishedAt = hasPublishedAt ? (publishedAtParse(menu.publishedAt, 'cookMenuUpsert') ?? null) : null;

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
        await cookMenuMealIdsAssertOwned(serverRuntime.db, cookId, mealIds, 'cookMenuUpsert');
        ({ courseInserts, optionInserts } = menuCoursePayloadsBuild(cookId, menuId, menu.courses!, 'cookMenuUpsert'));
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
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

async function cookMenuPatch(
    cookId: string,
    menuId: string,
    menu: GqlSCookMenuUpsert,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const hasTitle = menu.title !== undefined && menu.title !== null;
        const hasDescription = menu.description !== undefined && menu.description !== null;
        const hasPublishedAt = menu.publishedAt !== undefined;
        const hasCourses = menu.courses !== undefined && menu.courses !== null;

        if (!hasTitle && !hasDescription && !hasPublishedAt && !hasCourses) {
            throw new Error('cookMenuUpsert: at least one field is required');
        }

        const [existing] = await serverRuntime.db
            .select({
                menuId: menus.menuId,
                bookingRequestOfferId: menus.bookingRequestOfferId,
            })
            .from(menus)
            .where(and(eq(menus.menuId, menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt)))
            .limit(1);

        if (!existing) {
            throw new Error('cookMenuUpsert: menu not found');
        }

        const isOfferScoped = existing.bookingRequestOfferId != null;

        if (isOfferScoped && hasPublishedAt) {
            throw new Error('cookMenuUpsert: publishedAt is inventory-only');
        }

        if (isOfferScoped) {
            const contexts = await cookMenuOfferContextsLoad(serverRuntime.db, [existing.bookingRequestOfferId!]);
            const context = contexts.get(existing.bookingRequestOfferId!);
            if (context == null || !OFFER_MENU_NEGOTIABLE_STATUSES.has(context.status)) {
                throw new Error('cookMenuUpsert: offer menu is not editable');
            }
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
                throw new Error('cookMenuUpsert: title must not be empty');
            }
            set.title = title;
        }

        if (hasDescription) {
            set.description = textNormalizeProseTitled(menu.description!);
        }

        if (hasPublishedAt) {
            set.publishedAt = publishedAtParse(menu.publishedAt, 'cookMenuUpsert') ?? null;
        }

        let courseInserts: MenuCourseCreate[] | undefined;
        let optionInserts: MenuCourseMealOptionCreate[] | undefined;

        if (hasCourses) {
            const mealIds = menu.courses!.flatMap((course) => course.mealIds);
            await cookMenuMealIdsAssertOwned(serverRuntime.db, cookId, mealIds, 'cookMenuUpsert');
            ({ courseInserts, optionInserts } = menuCoursePayloadsBuild(cookId, menuId, menu.courses!, 'cookMenuUpsert'));
        }

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(menus)
                .set(set)
                .where(and(eq(menus.menuId, menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt)))
                .returning({ menuId: menus.menuId });

            if (updated.length === 0) {
                throw new Error('cookMenuUpsert: menu not found');
            }

            if (courseInserts != null && optionInserts != null) {
                await transaction.delete(menuCourses).where(and(eq(menuCourses.menuId, menuId), eq(menuCourses.cookId, cookId)));
                await transaction.insert(menuCourses).values(courseInserts);
                if (optionInserts.length > 0) {
                    await transaction.insert(menuCourseMealOptions).values(optionInserts);
                }
            }
        });

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

export async function cookMenuUpsert(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMenuUpsertArgs | undefined,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);

    const menu = args?.menu;
    const menuId = menu?.menuId ?? null;
    if (menuId == null || menuId === '') {
        return cookMenuInsert(cookId, menu, requestingSession, serverRuntime);
    }
    return cookMenuPatch(cookId, menuId, menu ?? {}, requestingSession, serverRuntime);
}

// Hand-built: GraphQL DateTime → z.date() breaks Gemini structuredOutputs.
// See docs/architecture/agent-delegation.md#tool-input-schemas.
const cookMenuUpsertToolSchema = z.object({
    menuId: z
        .string()
        .nullish()
        .describe(
            'Existing menu id when editing (inventory or negotiable offer copy). Omit to create an inventory draft. Pass an id from the snapshot — never invent one.',
        ),
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

/** AI-SDK tool — same write path as `CookMutation.menuUpsert`. */
export function toolCookMenuUpsert({
    cookId,
    requestingSession,
    serverRuntime,
}: {
    cookId: string;
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'Create or update a menu on the signed-in cook inventory (or patch a negotiable offer-scoped copy).',
            'Omit menuId to create an inventory draft; pass menuId from the snapshot to edit.',
            'Creating with title/description/courses materializes a full menu in one call; empty create seeds default courses.',
            'publishedAt is inventory-only. Soft-delete, copy, and sync-to-template are separate tools when available.',
        ].join(' '),
        inputSchema: cookMenuUpsertToolSchema as never,
        async execute(input: z.infer<typeof cookMenuUpsertToolSchema>) {
            const menu: GqlSCookMenuUpsert = {
                menuId: input.menuId ?? undefined,
                title: input.title ?? undefined,
                description: input.description ?? undefined,
                publishedAt: input.publishedAt === undefined ? undefined : input.publishedAt === null ? null : new Date(input.publishedAt),
                courses: (input.courses ?? undefined) as GqlSCookMenuCourseInput[] | undefined,
            };
            const result = await cookMenuUpsert({ cookId } as GqlSCookMutation, { menu }, requestingSession, serverRuntime);
            return {
                success: result.success,
                menuId: result.referenceId,
                created: menu.menuId == null || menu.menuId === '',
            };
        },
    });
}
