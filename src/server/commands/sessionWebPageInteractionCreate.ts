import { eq } from 'drizzle-orm';

import { bookingRequestFormFunnelArea, isBookingRequestFormFunnelStep } from '../../shared/bookingRequestFormFunnel';
import { cookBookingRequestOfferFunnelArea, isCookBookingRequestOfferFunnelClientStep } from '../../shared/cookBookingRequestOfferFunnel';
import { isNanoId } from '../../shared/idCreate';
import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { SessionEventWebPageInteractionPayload } from '../domain/sessionEvent';
import type { GqlSMutationResult, GqlSMutationSessionWebPageInteractionCreateArgs, GqlSSession } from '../graphql/generated';
import { sessionEventCreate } from '../utils/sessionEventCreate';

function parseInteraction(raw: unknown): SessionEventWebPageInteractionPayload['interaction'] | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const type = record.type;
    if (type === 'step_entered' || type === 'step_completed') {
        if (typeof record.step !== 'string') return null;
        if (isBookingRequestFormFunnelStep(record.step)) {
            return { type, step: record.step };
        }
        if (isCookBookingRequestOfferFunnelClientStep(record.step)) {
            return { type, step: record.step };
        }
        return null;
    }
    if (type === 'click' && typeof record.key === 'string' && record.key.length > 0 && record.key.length <= 128) {
        return { type: 'click', key: record.key };
    }
    if (
        type === 'change' &&
        typeof record.key === 'string' &&
        record.key.length > 0 &&
        record.key.length <= 128 &&
        typeof record.value === 'string' &&
        record.value.length <= 256
    ) {
        return { type: 'change', key: record.key, value: record.value };
    }
    return null;
}

export async function sessionWebPageInteractionCreate(
    args: GqlSMutationSessionWebPageInteractionCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const [session] = await serverRuntime.db
            .select({ wasTerminatedAt: sessions.wasTerminatedAt })
            .from(sessions)
            .where(eq(sessions.sessionId, requestingSession.sessionId))
            .limit(1);

        if (!session || session.wasTerminatedAt != null) {
            return { success: true, referenceId: null };
        }

        const area = args.input.area.trim().slice(0, 128);
        if (area.length === 0) {
            throw new Error('sessionWebPageInteractionCreate: area must not be empty');
        }

        const interaction = parseInteraction(args.input.interaction);
        if (!interaction) {
            throw new Error('sessionWebPageInteractionCreate: interaction is invalid');
        }

        const bookingRequestIdRaw = args.input.bookingRequestId?.trim() ?? null;
        const bookingRequestId =
            bookingRequestIdRaw && bookingRequestIdRaw.length > 0
                ? isNanoId(bookingRequestIdRaw)
                    ? bookingRequestIdRaw
                    : null
                : undefined;
        if (bookingRequestIdRaw && bookingRequestId == null) {
            throw new Error('sessionWebPageInteractionCreate: bookingRequestId is invalid');
        }

        if (interaction.type === 'step_entered' || interaction.type === 'step_completed') {
            if (area === bookingRequestFormFunnelArea) {
                if (!isBookingRequestFormFunnelStep(interaction.step)) {
                    throw new Error('sessionWebPageInteractionCreate: booking form step invalid for area');
                }
            } else if (area === cookBookingRequestOfferFunnelArea) {
                if (!isCookBookingRequestOfferFunnelClientStep(interaction.step)) {
                    throw new Error('sessionWebPageInteractionCreate: cook offer funnel step invalid for area');
                }
                if (bookingRequestId == null) {
                    throw new Error('sessionWebPageInteractionCreate: cook offer funnel requires bookingRequestId');
                }
            } else {
                throw new Error('sessionWebPageInteractionCreate: funnel steps require a known funnel area');
            }
        }

        const { sessionEventId } = await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: args.input.webPageKey,
                area,
                ...(bookingRequestId != null ? { bookingRequestId } : {}),
                interaction,
            },
        });

        return { success: true, referenceId: sessionEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
