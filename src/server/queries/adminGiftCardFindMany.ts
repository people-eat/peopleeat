import { tool } from 'ai';
import { z } from 'zod';

import { adminListDetailField, adminListToolOutputToModelResult, resolveAdminListDetail } from '../agents/adminListToolDetail';
import type { ChatAdminGiftCardListItem } from '../db/chatPayloadTypes';
import { giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminGiftCard, GqlSAdminGiftCardsArgs, GqlSSession } from '../graphql/generated';
import { GqlSGiftCardPaymentStatusSchema } from '../graphql/generated';
import { toGqlAdminGiftCard } from '../mappers/toGqlAdminGiftCard';
import { adminGiftCardCriterionWhere } from '../utils/adminGiftCardCriterionWhere';
import { adminGiftCardOrderBy } from '../utils/adminGiftCardOrderBy';
import { findManySkip, findManyTake } from '../utils/findManyTake';

const TOOL_TAKE_DEFAULT = 25;
const TOOL_TAKE_MAX = 25;
const ALL_PAYMENT_STATUSES = ['PREPARED', 'PAYED'] as const;

export async function adminGiftCardFindMany(
    args: GqlSAdminGiftCardsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminGiftCard[]> {
    try {
        const criterion = args.criterion;
        const where = adminGiftCardCriterionWhere(criterion);
        if (where === false) {
            return [];
        }

        const rows = await serverRuntime.db
            .select()
            .from(giftCards)
            .where(where)
            .orderBy(adminGiftCardOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return rows.map(toGqlAdminGiftCard);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

function dateToIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function adminGiftCardListCardSnapshot(rows: GqlSAdminGiftCard[]): ChatAdminGiftCardListItem[] {
    return rows.map((giftCard) => ({
        giftCardId: giftCard.giftCardId,
        buyerEmail: giftCard.buyerEmail,
        occasion: giftCard.occasion,
        recipientName: giftCard.recipientName,
        originalBalanceCents: giftCard.originalBalanceCents,
        balanceCents: giftCard.balanceCents,
        redeemCode: giftCard.redeemCode,
        paymentStatus: giftCard.paymentStatus,
        expiresAt: dateToIso(giftCard.expiresAt),
        createdAt: dateToIso(giftCard.createdAt),
    }));
}

const toolAdminGiftCardsFindManyInputSchema = z.object({
    giftCardIds: z
        .array(z.string())
        .optional()
        .describe('Primary-key filter. Use for follow-up drill-in from prior tool results (typically one id). Do not invent ids.'),
    searchText: z.string().optional().describe('Optional buyer email / recipient / redeem code / occasion search.'),
    paymentStatuses: z
        .array(GqlSGiftCardPaymentStatusSchema)
        .optional()
        .describe('Optional payment status filter. Omit to include PREPARED and PAYED.'),
    take: z.coerce
        .number()
        .int()
        .min(1)
        .max(TOOL_TAKE_MAX)
        .optional()
        .describe(`Max rows to return (default ${TOOL_TAKE_DEFAULT}, max ${TOOL_TAKE_MAX}).`),
    detail: adminListDetailField(),
});

export type ToolAdminGiftCardsFindManyInput = z.infer<typeof toolAdminGiftCardsFindManyInputSchema>;

export type ToolAdminGiftCardsFindManyOutput = {
    count: number;
    detail: 'summary' | 'evidence';
    giftCardIds: string[];
    giftCards: ChatAdminGiftCardListItem[];
};

/** AI-SDK tool — same read path as `Admin.giftCards`, card-shaped for chat. */
export function toolAdminGiftCardsFindMany({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'List admin gift cards matching a criterion.',
            'Use when the operator asks to show / list / find gift cards or vouchers.',
            'Optionally narrow with searchText or paymentStatuses.',
            'For a specific known gift card (follow-up drill-in), pass giftCardIds from a prior tool result.',
            'Default detail is summary (count + ids for the model; UI still shows cards). Pass detail=evidence when you need row fields.',
            'After the tool returns, summarize the count briefly in markdown — the UI renders the gift-card cards.',
            'Do not invent gift card ids or details not present in the tool result.',
        ].join(' '),
        inputSchema: toolAdminGiftCardsFindManyInputSchema,
        toModelOutput: ({ input, output }) => adminListToolOutputToModelResult(output, input.detail),
        async execute(input: ToolAdminGiftCardsFindManyInput): Promise<ToolAdminGiftCardsFindManyOutput> {
            const take = Math.min(Math.max(input.take ?? TOOL_TAKE_DEFAULT, 1), TOOL_TAKE_MAX);
            const detail = resolveAdminListDetail(input.detail);
            const paymentStatuses =
                input.paymentStatuses != null && input.paymentStatuses.length > 0 ? input.paymentStatuses : [...ALL_PAYMENT_STATUSES];
            const rows = await adminGiftCardFindMany(
                {
                    criterion: {
                        skip: 0,
                        take,
                        giftCardIds: input.giftCardIds,
                        searchText: input.searchText,
                        paymentStatuses,
                        sortField: 'createdAt',
                        sortDirection: 'DESC',
                    },
                },
                requestingSession,
                serverRuntime,
            );
            const giftCardCards = adminGiftCardListCardSnapshot(rows);
            return {
                count: giftCardCards.length,
                detail,
                giftCardIds: giftCardCards.map((giftCard) => giftCard.giftCardId),
                giftCards: giftCardCards,
            };
        },
    });
}
