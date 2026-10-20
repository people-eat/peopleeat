import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, cookTestimonials, customerTestimonials } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import type { ToolAdminTestimonialsFindManyOutput } from './adminTestimonialsFindMany';
import { toolAdminTestimonialsFindMany } from './adminTestimonialsFindMany';

async function runTool(
    tool: ReturnType<typeof toolAdminTestimonialsFindMany>,
    input: Parameters<NonNullable<typeof tool.execute>>[0],
): Promise<ToolAdminTestimonialsFindManyOutput> {
    const result = await tool.execute(input, {
        toolCallId: 't1',
        messages: [],
        abortSignal: new AbortController().signal,
        context: {},
    });
    return result as ToolAdminTestimonialsFindManyOutput;
}

describe('toolAdminTestimonialsFindMany', () => {
    it('filters by kind and ids and returns card snapshots', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Customer' });
        const cook = await commandSetup.withUser({ firstName: 'Bob', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const token = `tm-${idCreate().slice(0, 8)}`;
        const customerId = idCreate();
        const cookId = idCreate();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: customerId,
            userId: customer.user.userId,
            body: `${token} customer body`,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date(),
        });
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId: cookId,
            userId: cook.user.userId,
            cookId: cook.user.userId,
            body: `${token} cook body`,
            publicationStatus: 'PENDING_REVIEW',
        });

        const tool = toolAdminTestimonialsFindMany({
            requestingSession: customer.requestingSession,
            serverRuntime: customer.serverRuntime,
        });

        // Act
        const both = await runTool(tool, { searchText: token, detail: 'evidence' });
        const customerOnly = await runTool(tool, { kind: 'customer', searchText: token, detail: 'evidence' });
        const byCookId = await runTool(tool, { cookTestimonialIds: [cookId], detail: 'evidence' });
        const unknown = await runTool(tool, { customerTestimonialIds: [idCreate()], detail: 'evidence' });

        // Assert
        expect(both.count).toBe(2);
        expect(both.customerTestimonialIds).toEqual([customerId]);
        expect(both.cookTestimonialIds).toEqual([cookId]);
        expect(customerOnly.testimonials.map((item) => item.testimonialId)).toEqual([customerId]);
        expect(byCookId.testimonials.map((item) => item.testimonialId)).toEqual([cookId]);
        expect(unknown.count).toBe(0);
    });
});
