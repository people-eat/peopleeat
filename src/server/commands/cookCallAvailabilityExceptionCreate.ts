import { COOK_CALL_MINUTES_PER_DAY } from '../../shared/cookCallAvailability';
import { idCreate } from '../../shared/idCreate';
import type { CookCallAvailabilityExceptionCreate } from '../db/schema';
import { cookCallAvailabilityExceptions } from '../db/schema';
import type { CookCallAvailabilityExceptionType } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationCallAvailabilityExceptionCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { graphqlDateToIsoDate } from '../utils/graphqlDateToIsoDate';

const EXCEPTION_TYPES = new Set<CookCallAvailabilityExceptionType>(['BLOCK', 'OPEN']);

export async function cookCallAvailabilityExceptionCreate(
    { cookId }: GqlSCookMutation,
    { exception }: GqlSCookMutationCallAvailabilityExceptionCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const { date, type, startMinuteOfDay, endMinuteOfDay } = exception;

    if (!EXCEPTION_TYPES.has(type)) {
        throw new Error('cookCallAvailabilityExceptionCreate: type is invalid');
    }

    const bothNull = startMinuteOfDay == null && endMinuteOfDay == null;
    const bothSet = startMinuteOfDay != null && endMinuteOfDay != null;
    if (!bothNull && !bothSet) {
        throw new Error('cookCallAvailabilityExceptionCreate: minutes must both be null or both set');
    }
    if (bothSet) {
        if (startMinuteOfDay < 0 || endMinuteOfDay > COOK_CALL_MINUTES_PER_DAY) {
            throw new Error('cookCallAvailabilityExceptionCreate: minutes are out of range');
        }
        if (startMinuteOfDay >= endMinuteOfDay) {
            throw new Error('cookCallAvailabilityExceptionCreate: start must be before end');
        }
    }

    let dateString: string;
    try {
        dateString = graphqlDateToIsoDate(date);
    } catch {
        throw new Error('cookCallAvailabilityExceptionCreate: date is invalid');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        throw new Error('cookCallAvailabilityExceptionCreate: date is invalid');
    }

    const cookCallAvailabilityExceptionId = idCreate();
    const values: CookCallAvailabilityExceptionCreate = {
        cookCallAvailabilityExceptionId,
        cookId,
        date: dateString,
        type,
        startMinuteOfDay: bothSet ? startMinuteOfDay : null,
        endMinuteOfDay: bothSet ? endMinuteOfDay : null,
    };

    try {
        await serverRuntime.db.insert(cookCallAvailabilityExceptions).values(values);
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: cookCallAvailabilityExceptionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
