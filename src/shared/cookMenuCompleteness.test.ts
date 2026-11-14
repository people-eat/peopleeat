import { describe, expect, it } from 'vitest';

import { cookMenuCoursesAreComplete, cookMenuIsPublicCatalogEligible } from './cookMenuCompleteness';

describe('cookMenuCoursesAreComplete', () => {
    it('requires a titled course with at least one meal', () => {
        expect(cookMenuCoursesAreComplete([])).toBe(false);
        expect(cookMenuCoursesAreComplete([{ title: 'Starter', mealOptionCount: 0 }])).toBe(false);
        expect(cookMenuCoursesAreComplete([{ title: '  ', mealOptionCount: 1 }])).toBe(false);
        expect(cookMenuCoursesAreComplete([{ title: 'Starter', mealOptionCount: 1 }])).toBe(true);
    });
});

describe('cookMenuIsPublicCatalogEligible', () => {
    it('requires completeness and at least one meal image', () => {
        expect(
            cookMenuIsPublicCatalogEligible({
                courses: [{ title: 'Starter', mealOptionCount: 1 }],
                courseMealOptionImages: [],
            }),
        ).toBe(false);
        expect(
            cookMenuIsPublicCatalogEligible({
                courses: [{ title: 'Starter', mealOptionCount: 1 }],
                courseMealOptionImages: ['https://example.com/meal.jpg'],
            }),
        ).toBe(true);
    });
});
