import { and, eq, inArray, isNull } from 'drizzle-orm';

import { cookOfferAddons } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { cookOfferAddonDeepCopyInsert } from './cookOfferAddonDeepCopyInsert';

type DbExecutor = Pick<ServerRuntime['db'], 'select' | 'insert' | 'delete'>;

/**
 * Diff offer-scoped addon copies by library source id. Removes detached copies
 * (hard delete) and deep-copies newly attached library addons.
 */
export async function bookingRequestOfferAddonsSync(
    db: DbExecutor,
    input: {
        cookId: string;
        bookingRequestOfferId: string;
        suggestedAddonIds: string[];
    },
): Promise<{ titlesBefore: string[]; titlesAfter: string[] }> {
    const uniqueIds = [...new Set(input.suggestedAddonIds)];
    if (uniqueIds.length > 0) {
        const library = await db
            .select({ cookOfferAddonId: cookOfferAddons.cookOfferAddonId })
            .from(cookOfferAddons)
            .where(
                and(
                    eq(cookOfferAddons.cookId, input.cookId),
                    isNull(cookOfferAddons.bookingRequestOfferId),
                    isNull(cookOfferAddons.deletedAt),
                    inArray(cookOfferAddons.cookOfferAddonId, uniqueIds),
                ),
            );
        if (library.length !== uniqueIds.length) {
            throw new Error('bookingRequestOfferAddonsSync: one or more library addons not found');
        }
    }

    const existing = await db
        .select()
        .from(cookOfferAddons)
        .where(and(eq(cookOfferAddons.bookingRequestOfferId, input.bookingRequestOfferId), eq(cookOfferAddons.cookId, input.cookId)));

    const titlesBefore = existing.map((row) => row.title);
    const existingBySource = new Map(
        existing.filter((row) => row.copyOfCookOfferAddonId != null).map((row) => [row.copyOfCookOfferAddonId!, row]),
    );
    const keepSourceIds = new Set(uniqueIds);

    for (const row of existing) {
        const sourceId = row.copyOfCookOfferAddonId;
        if (sourceId == null || !keepSourceIds.has(sourceId)) {
            await db.delete(cookOfferAddons).where(eq(cookOfferAddons.cookOfferAddonId, row.cookOfferAddonId));
            if (sourceId) {
                existingBySource.delete(sourceId);
            }
        }
    }

    for (const sourceId of uniqueIds) {
        if (existingBySource.has(sourceId)) {
            continue;
        }
        await cookOfferAddonDeepCopyInsert(db, {
            cookId: input.cookId,
            sourceCookOfferAddonId: sourceId,
            bookingRequestOfferId: input.bookingRequestOfferId,
        });
    }

    const after = await db
        .select({ title: cookOfferAddons.title })
        .from(cookOfferAddons)
        .where(and(eq(cookOfferAddons.bookingRequestOfferId, input.bookingRequestOfferId), eq(cookOfferAddons.cookId, input.cookId)));

    return { titlesBefore, titlesAfter: after.map((row) => row.title) };
}
