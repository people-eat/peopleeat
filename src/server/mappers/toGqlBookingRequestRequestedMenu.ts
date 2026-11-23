import type { BookingRequestCookRequestedMenu } from '../domain/bookingRequest';
import type {
    GqlSBookingRequestOfferConfiguredMenuCourse,
    GqlSBookingRequestOfferConfiguredMenuMeal,
    GqlSBookingRequestRequestedMenu,
} from '../graphql/generated';

export function toGqlBookingRequestRequestedMenu(requestedMenu: BookingRequestCookRequestedMenu): GqlSBookingRequestRequestedMenu {
    return {
        menuId: requestedMenu.menuId,
        title: requestedMenu.title,
        description: requestedMenu.description,
        courses: requestedMenu.courses.map((course): GqlSBookingRequestOfferConfiguredMenuCourse => ({
            title: course.title,
            meals: course.meals.map((meal): GqlSBookingRequestOfferConfiguredMenuMeal => ({
                mealId: meal.mealId ?? null,
                mealTitle: meal.mealTitle,
                mealDescription: meal.mealDescription,
                mealImageUrl: meal.mealImageUrl ?? null,
            })),
        })),
    };
}
