import { and, asc, eq, isNull } from 'drizzle-orm';

import { cooks, meals, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export type CookAssistantStateSnapshot = {
    cookId: string;
    firstName: string | null;
    lastName: string | null;
    emailAddress: string | null;
    isVisible: boolean;
    isApprovedByAdmin: boolean;
    biography: string;
    biographySummary: string;
    cuisineStyle: string | null;
    cookingPhilosophy: string | null;
    travelExpensesAmount: number;
    maximumTravelDistance: number | null;
    minimumPriceAmount: number | null;
    maximumPriceAmount: number | null;
    minimumParticipants: number | null;
    maximumParticipants: number | null;
    callSchedulingEnabled: boolean;
    callDurationMinutes: number;
    travelOriginCity: string | null;
    mealCount: number;
    meals: Array<{
        mealId: string;
        title: string;
        description: string;
        isPublished: boolean;
    }>;
};

/**
 * Compact cook identity + inventory for the cook assistant system prompt.
 * Keeps meal bodies short so the prompt stays within a useful token budget.
 */
export async function cookAssistantStateSnapshotRead(
    serverRuntime: ServerRuntime,
    cookId: string,
): Promise<CookAssistantStateSnapshot | null> {
    const [row] = await serverRuntime.db
        .select({
            cookId: cooks.cookId,
            firstName: users.firstName,
            lastName: users.lastName,
            emailAddress: users.emailAddress,
            isVisible: cooks.isVisible,
            isApprovedByAdmin: cooks.isApprovedByAdmin,
            biography: cooks.biography,
            biographySummary: cooks.biographySummary,
            cuisineStyle: cooks.cuisineStyle,
            cookingPhilosophy: cooks.cookingPhilosophy,
            travelExpensesAmount: cooks.travelExpensesAmount,
            maximumTravelDistance: cooks.maximumTravelDistance,
            minimumPriceAmount: cooks.minimumPriceAmount,
            maximumPriceAmount: cooks.maximumPriceAmount,
            minimumParticipants: cooks.minimumParticipants,
            maximumParticipants: cooks.maximumParticipants,
            callSchedulingEnabled: cooks.callSchedulingEnabled,
            callDurationMinutes: cooks.callDurationMinutes,
            exactTravelOriginAddress: cooks.exactTravelOriginAddress,
        })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(eq(cooks.cookId, cookId))
        .limit(1);

    if (!row) return null;

    const mealRows = await serverRuntime.db
        .select({
            mealId: meals.mealId,
            title: meals.title,
            description: meals.description,
            publishedAt: meals.publishedAt,
        })
        .from(meals)
        .where(and(eq(meals.cookId, cookId), isNull(meals.deletedAt)))
        .orderBy(asc(meals.createdAt))
        .limit(40);

    const travelOriginCity = row.exactTravelOriginAddress?.city ?? null;

    return {
        cookId: row.cookId,
        firstName: row.firstName,
        lastName: row.lastName,
        emailAddress: row.emailAddress,
        isVisible: row.isVisible,
        isApprovedByAdmin: row.isApprovedByAdmin,
        biography: row.biography,
        biographySummary: row.biographySummary,
        cuisineStyle: row.cuisineStyle,
        cookingPhilosophy: row.cookingPhilosophy,
        travelExpensesAmount: row.travelExpensesAmount,
        maximumTravelDistance: row.maximumTravelDistance,
        minimumPriceAmount: row.minimumPriceAmount,
        maximumPriceAmount: row.maximumPriceAmount,
        minimumParticipants: row.minimumParticipants,
        maximumParticipants: row.maximumParticipants,
        callSchedulingEnabled: row.callSchedulingEnabled,
        callDurationMinutes: row.callDurationMinutes,
        travelOriginCity: typeof travelOriginCity === 'string' ? travelOriginCity : null,
        mealCount: mealRows.length,
        meals: mealRows.map((meal) => ({
            mealId: meal.mealId,
            title: meal.title,
            description: meal.description.length > 180 ? `${meal.description.slice(0, 177)}…` : meal.description,
            isPublished: meal.publishedAt != null,
        })),
    };
}

/** Render snapshot as a fenced JSON block for the system prompt. */
export function cookAssistantStateSnapshotFormat(snapshot: CookAssistantStateSnapshot): string {
    return [
        'Signed-in cook state (authoritative for this turn — do not invent missing fields):',
        '```json',
        JSON.stringify(snapshot, null, 2),
        '```',
    ].join('\n');
}
