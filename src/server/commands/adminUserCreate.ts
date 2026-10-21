import { eq } from 'drizzle-orm';

import { emailNormalize } from '../../shared/emailNormalize';
import { idCreate } from '../../shared/idCreate';
import { DEFAULT_LOCALE } from '../../shared/locale';
import { phoneNumberAssert } from '../../shared/phoneNumber';
import { textNormalizeTitled } from '../../shared/textNormalize';
import { DEFAULT_TIME_ZONE } from '../../shared/timeZone';
import { userBirthDateAssertMinimumAge } from '../../shared/userBirthDate';
import type { AdminCreate, UserCreate } from '../db/schema';
import { admins, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationUserCreateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookCreatePayloadBuild } from '../utils/cookCreatePayloadBuild';

export async function adminUserCreate(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationUserCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    // Phase 1 — Payload construction (pure validation + Places resolve; no DB writes yet)
    const email = emailNormalize(input.emailAddress);
    const firstName = textNormalizeTitled(input.firstName);
    const lastName = textNormalizeTitled(input.lastName);
    const phoneNumber = phoneNumberAssert(input.phoneNumber, 'adminUserCreate');
    const birthDate = input.birthDate;
    const preferredCommunication = input.preferredCommunication;
    const locale = input.locale ?? DEFAULT_LOCALE;
    const timeZone = input.timeZone?.trim() || DEFAULT_TIME_ZONE;

    if (firstName.length === 0) {
        throw new Error('adminUserCreate: firstName must not be empty');
    }
    if (lastName.length === 0) {
        throw new Error('adminUserCreate: lastName must not be empty');
    }
    if (!birthDate) {
        throw new Error('adminUserCreate: birthDate is required');
    }
    userBirthDateAssertMinimumAge(birthDate, 'adminUserCreate');

    const userId = idCreate();
    const userInsert: UserCreate = {
        userId,
        emailAddress: email,
        firstName,
        lastName,
        phoneNumber,
        birthDate,
        preferredCommunication,
        locale,
        timeZone,
        // Admin-created users still accept legal on first log-on.
        lastAcceptedPrivacyPolicy: null,
        lastAcceptedTerms: null,
    };
    const adminInsert: AdminCreate | undefined = input.asAdmin ? { adminId: userId } : undefined;

    try {
        const cookPayload = input.cook
            ? await cookCreatePayloadBuild({
                  input: input.cook,
                  sessionToken: requestingSession.sessionId,
                  places: serverRuntime.places,
                  errorPrefix: 'adminUserCreate',
              })
            : undefined;

        // Phase 2 — Transactional execution
        await serverRuntime.db.transaction(async (transaction) => {
            const [existingEmail] = await transaction
                .select({ userId: users.userId })
                .from(users)
                .where(eq(users.emailAddress, email))
                .limit(1);
            if (existingEmail) {
                throw new Error('adminUserCreate: email already registered');
            }

            const [existingPhone] = await transaction
                .select({ userId: users.userId })
                .from(users)
                .where(eq(users.phoneNumber, phoneNumber))
                .limit(1);
            if (existingPhone) {
                throw new Error('adminUserCreate: phoneNumber already registered');
            }

            await transaction.insert(users).values(userInsert);
            if (adminInsert) {
                await transaction.insert(admins).values(adminInsert);
            }
            if (cookPayload) {
                await transaction.insert(cooks).values({ cookId: userId, ...cookPayload });
            }
        });

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
