/** Offer pickers and public catalog require every course to have a title and ≥ 1 meal. */
export function cookMenuCoursesAreComplete(courses: ReadonlyArray<{ title: string; mealOptionCount: number }>): boolean {
    return courses.length >= 1 && courses.every((course) => course.title.trim().length > 0 && course.mealOptionCount >= 1);
}

/** Public chef-page catalog: complete inventory menu with at least one meal-option image. */
export function cookMenuIsPublicCatalogEligible(input: {
    courses: ReadonlyArray<{ title: string; mealOptionCount: number }>;
    courseMealOptionImages: ReadonlyArray<string>;
}): boolean {
    return cookMenuCoursesAreComplete(input.courses) && input.courseMealOptionImages.length >= 1;
}
