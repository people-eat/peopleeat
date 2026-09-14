import type { BookingRequestCookMenuEvaluation } from '../domain/bookingRequest';
import type { GqlSBookingRequestCookMenuEvaluation } from '../graphql/generated';

export function toGqlBookingRequestCookMenuEvaluation(evaluation: BookingRequestCookMenuEvaluation): GqlSBookingRequestCookMenuEvaluation {
    return {
        evaluationSummary: evaluation.evaluationSummary,
        menus: evaluation.menus.map((menu) => ({
            menuId: menu.menuId,
            evaluationSummary: menu.evaluationSummary,
            isSuitable: menu.isSuitable,
        })),
        generatedMenu: evaluation.generatedMenu
            ? {
                  title: evaluation.generatedMenu.title,
                  description: evaluation.generatedMenu.description,
                  courses: evaluation.generatedMenu.courses.map((course) => ({
                      title: course.title,
                      mealOptions: course.mealOptions.map((mealOption) => ({
                          type: mealOption.type,
                          mealId: mealOption.mealId,
                          title: mealOption.title,
                          description: mealOption.description,
                      })),
                  })),
              }
            : null,
    };
}
