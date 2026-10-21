import { isCookingPhilosophy, isCuisineStyle } from '../../shared/cookProfile';
import { textNormalizeProse, textNormalizeSingleLine } from '../../shared/textNormalize';
import type { CookCreate } from '../db/schema';
import type { GqlSCookCreate } from '../graphql/generated';
import type { Places } from '../places/Places';
import { cookTravelOriginAddressResolve } from './cookTravelOriginAddressResolve';

export const COOK_MINIMUM_TRAVEL_EXPENSES_AMOUNT = 25;
export const COOK_MINIMUM_TRAVEL_DISTANCE_KM = 5;
export const COOK_MAXIMUM_TRAVEL_DISTANCE_KM = 250;

/** Validated DB insert fields for a new cook row (caller sets `cookId`). */
export type CookCreatePayload = Omit<CookCreate, 'cookId'>;

export async function cookCreatePayloadBuild({
    input,
    sessionToken,
    places,
    errorPrefix,
}: {
    input: GqlSCookCreate;
    sessionToken: string;
    places: Places;
    errorPrefix: string;
}): Promise<CookCreatePayload> {
    const biography = textNormalizeProse(input.biography ?? '');
    const cuisineStyleRaw = textNormalizeSingleLine(input.cuisineStyle ?? '');
    const cookingPhilosophyRaw = textNormalizeSingleLine(input.cookingPhilosophy ?? '');
    const { travelExpensesAmount, maximumTravelDistance } = input;

    const cuisineStyle = cuisineStyleRaw.length > 0 ? cuisineStyleRaw : null;
    const cookingPhilosophy = cookingPhilosophyRaw.length > 0 ? cookingPhilosophyRaw : null;

    if (cuisineStyle !== null && !isCuisineStyle(cuisineStyle)) {
        throw new Error(`${errorPrefix}: cuisineStyle is invalid`);
    }
    if (cookingPhilosophy !== null && !isCookingPhilosophy(cookingPhilosophy)) {
        throw new Error(`${errorPrefix}: cookingPhilosophy is invalid`);
    }
    if (travelExpensesAmount < COOK_MINIMUM_TRAVEL_EXPENSES_AMOUNT) {
        throw new Error(`${errorPrefix}: travelExpensesAmount is below minimum`);
    }
    if (maximumTravelDistance < COOK_MINIMUM_TRAVEL_DISTANCE_KM || maximumTravelDistance > COOK_MAXIMUM_TRAVEL_DISTANCE_KM) {
        throw new Error(`${errorPrefix}: maximumTravelDistance is out of range`);
    }

    const exactTravelOriginAddress = await cookTravelOriginAddressResolve({
        exactTravelOriginAddress: input.exactTravelOriginAddress,
        sessionToken,
        places,
        errorPrefix,
    });

    return {
        exactTravelOriginAddress,
        biography,
        cuisineStyle,
        cookingPhilosophy,
        travelExpensesAmount,
        maximumTravelDistance,
    };
}
