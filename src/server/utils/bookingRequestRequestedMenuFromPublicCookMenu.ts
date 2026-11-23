import type { BookingRequestCookRequestedMenu } from '../domain/bookingRequest';
import type { GqlSPublicCookMenu } from '../graphql/generated';

/** Freeze a public catalog menu onto the requested cook's affinity row. */
export function bookingRequestRequestedMenuFromPublicCookMenu(menu: GqlSPublicCookMenu): BookingRequestCookRequestedMenu {
    return {
        menuId: menu.menuId,
        title: menu.title,
        description: menu.description,
        courses: menu.courses.map((course) => ({
            title: course.title,
            meals: course.mealOptions.map((meal) => ({
                mealId: meal.mealId,
                mealTitle: meal.title,
                mealDescription: meal.description,
                ...(meal.imageUrl != null && meal.imageUrl.length > 0 ? { mealImageUrl: meal.imageUrl } : {}),
            })),
        })),
    };
}
