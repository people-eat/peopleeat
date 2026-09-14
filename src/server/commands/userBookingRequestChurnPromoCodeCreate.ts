import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { PromoCodeCreate } from '../db/schema';
import { promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestChurnPromoCodeCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { redeemCodeCreate } from '../utils/redeemCodeCreate';
import { userBookingRequestOwnedFindOne } from '../utils/userBookingRequestOwnedFindOne';

const CHURN_AMOUNT_CENTS = 5000;
const CHURN_EXPIRY_DAYS = 30;

export async function userBookingRequestChurnPromoCodeCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestChurnPromoCodeCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestId } = args;

    try {
        const bookingRequest = await userBookingRequestOwnedFindOne(serverRuntime, userId, bookingRequestId);
        if (!bookingRequest) {
            throw new Error('userBookingRequestChurnPromoCodeCreate: booking request not found');
        }

        const [existing] = await serverRuntime.db
            .select()
            .from(promoCodes)
            .where(eq(promoCodes.bookingRequestId, bookingRequestId))
            .limit(1);

        if (existing) {
            return { success: true, referenceId: existing.redeemCode };
        }

        const redeemCode = redeemCodeCreate();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + CHURN_EXPIRY_DAYS);

        const values: PromoCodeCreate = {
            promoCodeId: idCreate(),
            redeemCode,
            amountCents: CHURN_AMOUNT_CENTS,
            bookingRequestId,
            expiresAt,
        };

        await serverRuntime.db.insert(promoCodes).values(values);
        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: redeemCode };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
