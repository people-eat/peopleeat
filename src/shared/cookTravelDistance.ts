/** Standard max-distance choices on cook travel / sign-up selects (km). */
export const COOK_TRAVEL_DISTANCE_SELECT_OPTIONS_KM = [50, 100, 150, 200] as const;

export const COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM = 100;

/** Form / Select string for a cook's max distance (falls back to the default choice). */
export function cookTravelDistanceSelectValue(currentKm: number | null | undefined): string {
    return String(currentKm ?? COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM);
}

/**
 * Select option values for max travel distance. Always includes the standard choices; when the cook
 * already has a non-standard saved km (legacy imports), that value is included so the trigger is not blank.
 */
export function cookTravelDistanceSelectOptions(currentKm: number | null | undefined = undefined): string[] {
    const options = new Set<string>(COOK_TRAVEL_DISTANCE_SELECT_OPTIONS_KM.map(String));
    if (currentKm != null && Number.isFinite(currentKm)) {
        options.add(String(Math.trunc(currentKm)));
    }
    return [...options].sort((a, b) => Number(a) - Number(b));
}
