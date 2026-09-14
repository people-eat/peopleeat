import type { GqlSAdminCookMenu, GqlSAdminCookMenuCourse } from '../graphql/generated';

export function toGqlAdminCookMenu(
    row: {
        menuId: string;
        cookId: string;
        title: string;
        description: string;
        copyOfMenuId?: string | null;
        bookingRequestOfferId?: string | null;
        publishedAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    },
    cookName: string,
    courseCount: number,
    courseMealOptionImages: string[],
    courses: GqlSAdminCookMenuCourse[] = [],
): GqlSAdminCookMenu {
    return {
        menuId: row.menuId,
        cookId: row.cookId,
        cookName,
        title: row.title,
        description: row.description,
        courseCount,
        courseMealOptionImages,
        courses,
        copyOfMenuId: row.copyOfMenuId ?? null,
        bookingRequestOfferId: row.bookingRequestOfferId ?? null,
        publishedAt: row.publishedAt,
        deletedAt: row.deletedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
