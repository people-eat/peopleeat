import { describe, expect, it } from 'vitest';

import {
    isTestimonialRating,
    testimonialRatingAssertOptional,
    testimonialRatingAssertRequired,
    testimonialRatingNormalize,
} from './testimonialRating';

describe('isTestimonialRating', () => {
    it('accepts integers 1–5', () => {
        expect(isTestimonialRating(1)).toBe(true);
        expect(isTestimonialRating(5)).toBe(true);
    });

    it('rejects 0, out-of-range, and non-integers', () => {
        expect(isTestimonialRating(0)).toBe(false);
        expect(isTestimonialRating(6)).toBe(false);
        expect(isTestimonialRating(3.5)).toBe(false);
        expect(isTestimonialRating(null)).toBe(false);
        expect(isTestimonialRating(undefined)).toBe(false);
    });
});

describe('testimonialRatingNormalize', () => {
    it('maps nullish to null and keeps 1–5', () => {
        expect(testimonialRatingNormalize(null)).toBeNull();
        expect(testimonialRatingNormalize(undefined)).toBeNull();
        expect(testimonialRatingNormalize(4)).toBe(4);
    });

    it('rejects 0 and other invalid values', () => {
        expect(testimonialRatingNormalize(0)).toBeUndefined();
        expect(testimonialRatingNormalize(-1)).toBeUndefined();
        expect(testimonialRatingNormalize(6)).toBeUndefined();
    });
});

describe('testimonialRatingAssertOptional', () => {
    it('allows null and valid ratings', () => {
        expect(testimonialRatingAssertOptional(null, 'admin')).toBeNull();
        expect(testimonialRatingAssertOptional(2, 'admin')).toBe(2);
    });

    it('throws on 0', () => {
        expect(() => testimonialRatingAssertOptional(0, 'admin')).toThrow(/admin: rating must be an integer from 1 to 5/);
    });
});

describe('testimonialRatingAssertRequired', () => {
    it('returns a valid rating', () => {
        expect(testimonialRatingAssertRequired(5, 'create')).toBe(5);
    });

    it('rejects null and 0', () => {
        expect(() => testimonialRatingAssertRequired(null, 'create')).toThrow(/create: rating is required/);
        expect(() => testimonialRatingAssertRequired(0, 'create')).toThrow(/create: rating must be an integer from 1 to 5/);
    });
});
