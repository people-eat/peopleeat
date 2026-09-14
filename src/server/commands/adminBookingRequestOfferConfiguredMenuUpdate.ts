import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferConfiguredMenu } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferConfiguredMenuUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

function assertOptionalUrl(value: string | null | undefined, fieldName: string): string | undefined {
    if (value == null) return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    try {
        new URL(trimmed);
    } catch {
        throw new Error(`adminBookingRequestOfferConfiguredMenuUpdate: ${fieldName} must be a valid URL`);
    }
    return trimmed;
}

export async function adminBookingRequestOfferConfiguredMenuUpdate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferConfiguredMenuUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestOfferId = args.bookingRequestOfferId.trim();
    if (bookingRequestOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferConfiguredMenuUpdate: bookingRequestOfferId must not be empty');
    }

    const title = args.configuredMenu.title.trim();
    if (title.length === 0) {
        throw new Error('adminBookingRequestOfferConfiguredMenuUpdate: title must not be empty');
    }

    if (args.configuredMenu.courses.length < 1) {
        throw new Error('adminBookingRequestOfferConfiguredMenuUpdate: at least one course is required');
    }

    const courses: BookingRequestOfferConfiguredMenu['courses'] = [];
    for (const [courseIndex, course] of args.configuredMenu.courses.entries()) {
        const courseTitle = course.title.trim();
        if (courseTitle.length === 0) {
            throw new Error(`adminBookingRequestOfferConfiguredMenuUpdate: course ${courseIndex} title must not be empty`);
        }
        if (course.meals.length < 1) {
            throw new Error(`adminBookingRequestOfferConfiguredMenuUpdate: course ${courseIndex} requires at least one meal`);
        }

        const meals: BookingRequestOfferConfiguredMenu['courses'][number]['meals'] = [];
        for (const [mealIndex, meal] of course.meals.entries()) {
            const mealTitle = meal.mealTitle.trim();
            if (mealTitle.length === 0) {
                throw new Error(
                    `adminBookingRequestOfferConfiguredMenuUpdate: course ${courseIndex} meal ${mealIndex} title must not be empty`,
                );
            }
            meals.push({
                mealTitle,
                mealDescription: meal.mealDescription.trim(),
                mealImageUrl: assertOptionalUrl(meal.mealImageUrl, `course ${courseIndex} meal ${mealIndex} imageUrl`),
            });
        }

        courses.push({ title: courseTitle, meals });
    }

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferConfiguredMenuUpdate: offer not found');
        }

        if (row.offer.configuredMenu == null) {
            throw new Error('adminBookingRequestOfferConfiguredMenuUpdate: configured menu not found');
        }

        const configuredMenu: BookingRequestOfferConfiguredMenu = {
            menuId: row.offer.configuredMenu.menuId,
            title,
            description: args.configuredMenu.description.trim(),
            courses,
        };

        await serverRuntime.db
            .update(bookingRequestOffers)
            .set({ configuredMenu })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
