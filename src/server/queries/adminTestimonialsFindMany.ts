import { tool } from 'ai';
import { z } from 'zod';

import { adminListDetailField, adminListToolOutputToModelResult, resolveAdminListDetail } from '../agents/adminListToolDetail';
import type { ChatAdminTestimonialListItem } from '../db/chatPayloadTypes';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookTestimonial, GqlSAdminCustomerTestimonial, GqlSSession } from '../graphql/generated';
import { GqlSTestimonialPublicationStatusSchema } from '../graphql/generated';
import { adminCookTestimonialsFindMany } from './adminCookTestimonialsFindMany';
import { adminCustomerTestimonialsFindMany } from './adminCustomerTestimonialsFindMany';

const TOOL_TAKE_DEFAULT = 25;
const TOOL_TAKE_MAX = 25;

const kindSchema = z.enum(['customer', 'cook']);

function dateToIso(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function matchesSearch(haystacks: Array<string | null | undefined>, searchText: string | undefined): boolean {
    if (searchText == null || searchText.trim().length === 0) return true;
    const needle = searchText.trim().toLowerCase();
    return haystacks.some((value) => value != null && value.toLowerCase().includes(needle));
}

function customerToCard(row: GqlSAdminCustomerTestimonial): ChatAdminTestimonialListItem {
    return {
        kind: 'customer',
        testimonialId: row.customerTestimonialId,
        displayAuthorName: row.displayAuthorName,
        displayLocation: row.displayLocation ?? null,
        displayOccasion: row.displayOccasion ?? null,
        body: row.body,
        rating: row.rating ?? null,
        publicationStatus: row.publicationStatus,
        publishedAt: dateToIso(row.publishedAt),
        createdAt: dateToIso(row.createdAt) ?? new Date(0).toISOString(),
        imageUrl: row.imageUrls[0] ?? null,
    };
}

function cookToCard(row: GqlSAdminCookTestimonial): ChatAdminTestimonialListItem {
    return {
        kind: 'cook',
        testimonialId: row.cookTestimonialId,
        displayAuthorName: row.displayAuthorName,
        displayLocation: row.displayLocation ?? null,
        displayOccasion: row.displayOccasion ?? null,
        body: row.body ?? null,
        rating: row.rating ?? null,
        publicationStatus: row.publicationStatus,
        publishedAt: dateToIso(row.publishedAt),
        createdAt: dateToIso(row.createdAt) ?? new Date(0).toISOString(),
        imageUrl: row.imageUrls[0] ?? null,
    };
}

const toolAdminTestimonialsFindManyInputSchema = z.object({
    kind: kindSchema.optional().describe('Optional audience filter. Omit to include customer and cook testimonials.'),
    customerTestimonialIds: z
        .array(z.string())
        .optional()
        .describe('Customer testimonial primary-key filter. Use for follow-up drill-in. Do not invent ids.'),
    cookTestimonialIds: z
        .array(z.string())
        .optional()
        .describe('Cook testimonial primary-key filter. Use for follow-up drill-in. Do not invent ids.'),
    searchText: z.string().optional().describe('Optional author / location / occasion / body search.'),
    publicationStatuses: z
        .array(GqlSTestimonialPublicationStatusSchema)
        .optional()
        .describe('Optional publication status filter (PENDING_REVIEW / PUBLISHED).'),
    take: z.coerce
        .number()
        .int()
        .min(1)
        .max(TOOL_TAKE_MAX)
        .optional()
        .describe(`Max rows to return (default ${TOOL_TAKE_DEFAULT}, max ${TOOL_TAKE_MAX}).`),
    detail: adminListDetailField(),
});

export type ToolAdminTestimonialsFindManyInput = z.infer<typeof toolAdminTestimonialsFindManyInputSchema>;

export type ToolAdminTestimonialsFindManyOutput = {
    count: number;
    detail: 'summary' | 'evidence';
    customerTestimonialIds: string[];
    cookTestimonialIds: string[];
    testimonials: ChatAdminTestimonialListItem[];
};

/** AI-SDK tool — wraps admin customer + cook testimonial catalogs, card-shaped for chat. */
export function toolAdminTestimonialsFindMany({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'List admin customer and/or cook testimonials.',
            'Use when the operator asks to show / list / find testimonials or reviews.',
            'Optionally narrow with kind, searchText, or publicationStatuses.',
            'For a specific known testimonial (follow-up drill-in), pass customerTestimonialIds or cookTestimonialIds from a prior tool result.',
            'Default detail is summary (count + ids for the model; UI still shows cards). Pass detail=evidence when you need row fields.',
            'After the tool returns, summarize the count briefly in markdown — the UI renders the testimonial cards.',
            'Do not invent testimonial ids or details not present in the tool result.',
        ].join(' '),
        inputSchema: toolAdminTestimonialsFindManyInputSchema,
        toModelOutput: ({ input, output }) => adminListToolOutputToModelResult(output, input.detail),
        async execute(input: ToolAdminTestimonialsFindManyInput): Promise<ToolAdminTestimonialsFindManyOutput> {
            const take = Math.min(Math.max(input.take ?? TOOL_TAKE_DEFAULT, 1), TOOL_TAKE_MAX);
            const detail = resolveAdminListDetail(input.detail);
            const customerIdFilter =
                input.customerTestimonialIds && input.customerTestimonialIds.length > 0 ? new Set(input.customerTestimonialIds) : null;
            const cookIdFilter = input.cookTestimonialIds && input.cookTestimonialIds.length > 0 ? new Set(input.cookTestimonialIds) : null;
            // Id filters imply their kind so a cook-id drill-in does not also dump the customer catalog.
            const includeCustomer =
                (input.kind == null || input.kind === 'customer') &&
                (input.kind === 'customer' || cookIdFilter == null || customerIdFilter != null);
            const includeCook =
                (input.kind == null || input.kind === 'cook') &&
                (input.kind === 'cook' || customerIdFilter == null || cookIdFilter != null);

            const [customerRows, cookRows] = await Promise.all([
                includeCustomer ? adminCustomerTestimonialsFindMany(requestingSession, serverRuntime) : Promise.resolve([]),
                includeCook ? adminCookTestimonialsFindMany(requestingSession, serverRuntime) : Promise.resolve([]),
            ]);

            const publicationFilter =
                input.publicationStatuses && input.publicationStatuses.length > 0 ? new Set(input.publicationStatuses) : null;

            const cards: ChatAdminTestimonialListItem[] = [];

            for (const row of customerRows) {
                if (customerIdFilter && !customerIdFilter.has(row.customerTestimonialId)) continue;
                if (publicationFilter && !publicationFilter.has(row.publicationStatus)) continue;
                if (
                    !matchesSearch(
                        [row.displayAuthorName, row.displayLocation, row.displayOccasion, row.body, row.customerTestimonialId],
                        input.searchText,
                    )
                ) {
                    continue;
                }
                cards.push(customerToCard(row));
            }

            for (const row of cookRows) {
                if (cookIdFilter && !cookIdFilter.has(row.cookTestimonialId)) continue;
                if (publicationFilter && !publicationFilter.has(row.publicationStatus)) continue;
                if (
                    !matchesSearch(
                        [row.displayAuthorName, row.displayLocation, row.displayOccasion, row.body, row.cookTestimonialId],
                        input.searchText,
                    )
                ) {
                    continue;
                }
                cards.push(cookToCard(row));
            }

            cards.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const testimonials = cards.slice(0, take);

            return {
                count: testimonials.length,
                detail,
                customerTestimonialIds: testimonials.filter((item) => item.kind === 'customer').map((item) => item.testimonialId),
                cookTestimonialIds: testimonials.filter((item) => item.kind === 'cook').map((item) => item.testimonialId),
                testimonials,
            };
        },
    });
}
