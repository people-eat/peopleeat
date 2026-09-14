/** Collapse invalid multi-select limits to single-select (`null`). */
export function menuMealSelectionLimitNormalize(raw: number | null | undefined, mealCount: number): number | null {
    if (raw == null) return null;
    if (mealCount >= 2 && raw >= 2 && raw <= mealCount) return raw;
    return null;
}
