import type { BookingRequestOfferConfiguredMenu } from '../domain/bookingRequest';
import type {
    GqlSBookingRequestOfferConfiguredMenu,
    GqlSBookingRequestOfferConfiguredMenuCourse,
    GqlSBookingRequestOfferConfiguredMenuMeal,
} from '../graphql/generated';

export function toGqlBookingRequestOfferConfiguredMenu(
    configuredMenu: BookingRequestOfferConfiguredMenu,
): GqlSBookingRequestOfferConfiguredMenu {
    return {
        menuId: configuredMenu.menuId ?? null,
        title: configuredMenu.title,
        description: configuredMenu.description,
        courses: configuredMenu.courses.map((course): GqlSBookingRequestOfferConfiguredMenuCourse => ({
            title: course.title,
            meals: course.meals.map((meal): GqlSBookingRequestOfferConfiguredMenuMeal => ({
                mealTitle: meal.mealTitle,
                mealDescription: meal.mealDescription,
                mealImageUrl: meal.mealImageUrl ?? null,
            })),
        })),
    };
}
