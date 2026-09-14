import { eq } from 'drizzle-orm';

import { cooks, users } from '../db/schema';
import type { CookTravelOriginAddress } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationStripeOnboardingStartArgs,
    GqlSCookStripeOnboardingResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import type { StripeAccountCreate } from '../stripe/StripePayment';

function stripeAccountDateOfBirthFromBirthDate(birthDate: string | null): StripeAccountCreate['dateOfBirth'] {
    if (!birthDate) return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
    if (!match) return undefined;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    return { day, month, year };
}

function stripeAccountAddressFromTravelOrigin(travelOrigin: CookTravelOriginAddress | null): StripeAccountCreate['address'] {
    if (!travelOrigin) return undefined;
    const country = travelOrigin.country.trim();
    const city = travelOrigin.city.trim();
    const postCode = travelOrigin.postCode.trim();
    const line1 = travelOrigin.addressLine1.trim();
    if (!country || !city || !postCode || !line1) return undefined;
    const line2 = travelOrigin.addressLine2.trim();
    return {
        country,
        city,
        postCode,
        line1,
        ...(line2 ? { line2 } : {}),
    };
}

export async function cookStripeOnboardingStart(
    { cookId }: GqlSCookMutation,
    { returnUrl, refreshUrl }: GqlSCookMutationStripeOnboardingStartArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeOnboardingResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const [row] = await serverRuntime.db
            .select({
                cook: cooks,
                emailAddress: users.emailAddress,
                firstName: users.firstName,
                lastName: users.lastName,
                phoneNumber: users.phoneNumber,
                birthDate: users.birthDate,
            })
            .from(cooks)
            .innerJoin(users, eq(users.userId, cooks.cookId))
            .where(eq(cooks.cookId, cookId))
            .limit(1);

        if (!row?.emailAddress) {
            throw new Error('cookStripeOnboardingStart: cook not found');
        }

        if (!row.cook.isApprovedByAdmin) {
            return { kind: 'NOT_APPROVED', url: null };
        }

        let accountId = row.cook.stripeAccountId;

        if (!accountId) {
            const phoneNumber = row.phoneNumber?.trim() || undefined;
            const dateOfBirth = stripeAccountDateOfBirthFromBirthDate(row.birthDate);
            const address = stripeAccountAddressFromTravelOrigin(row.cook.exactTravelOriginAddress);

            const result = await serverRuntime.stripe.accountCreate({
                cookId,
                emailAddress: row.emailAddress,
                firstName: row.firstName,
                lastName: row.lastName,
                ...(phoneNumber ? { phoneNumber } : {}),
                ...(dateOfBirth ? { dateOfBirth } : {}),
                ...(address ? { address } : {}),
                existingAccountId: undefined,
            });

            if (result.kind === 'onboardingComplete') {
                await serverRuntime.db
                    .update(cooks)
                    .set({
                        stripeAccountId: result.accountId,
                        stripeAccountActive: true,
                        stripeAccountActiveWasReset: false,
                        lastModifiedAt: new Date(),
                    })
                    .where(eq(cooks.cookId, cookId));
                await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
                return { kind: 'ALREADY_COMPLETE', url: null };
            }

            accountId = result.accountId;
            await serverRuntime.db
                .update(cooks)
                .set({
                    stripeAccountId: accountId,
                    stripeAccountActive: false,
                    stripeAccountActiveWasReset: false,
                    lastModifiedAt: new Date(),
                })
                .where(eq(cooks.cookId, cookId));
            await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        }

        if (row.cook.stripeAccountActive && !row.cook.stripeAccountActiveWasReset) {
            const completed = await serverRuntime.stripe.accountOnboardingCompletedCheck(accountId);
            if (completed) {
                return { kind: 'ALREADY_COMPLETE', url: null };
            }
        }

        const onboardingUrl = await serverRuntime.stripe.accountOnboardingUrlCreate(accountId, new URL(refreshUrl), new URL(returnUrl));

        return { kind: 'ONBOARDING_URL', url: onboardingUrl.href };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
