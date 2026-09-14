import { idCreate } from '../../shared/idCreate';
import type { BookingRequestOfferEvent, BookingRequestOfferEventCreate } from '../db/schema';
import { bookingRequestOfferEvents } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

type DbInserter = Pick<ServerRuntime['db'], 'insert'>;

export function bookingRequestOfferInitialMessageResolve(bookingRequest: {
    originalMessage: string;
    adjustedMessage: string | null;
}): string {
    return (bookingRequest.adjustedMessage ?? bookingRequest.originalMessage).trim();
}

/** True when the request message is already present as a chat opener (at/before COOK_CREATED). */
export function bookingRequestOfferInitialChatMessageAlreadySeeded(
    events: ReadonlyArray<Pick<BookingRequestOfferEvent, 'type' | 'payload' | 'createdAt'>>,
    initialMessage: string,
): boolean {
    if (initialMessage.length === 0) return true;
    const cookCreatedAt = events.find((event) => event.type === 'COOK_CREATED')?.createdAt;
    return events.some((event) => {
        if (event.type !== 'USER_MESSAGE_SIMPLE') return false;
        const body = (event.payload as { messageBody?: string }).messageBody;
        if (body !== initialMessage) return false;
        if (!cookCreatedAt) return true;
        return event.createdAt.getTime() <= cookCreatedAt.getTime();
    });
}

export async function bookingRequestOfferInitialChatMessageInsert(
    db: DbInserter,
    input: {
        bookingRequestOfferId: string;
        initialMessage: string;
        /** Anchor timestamp (COOK_CREATED / first event / now). Seed is written 1ms earlier. */
        cookCreatedAt: Date;
    },
): Promise<BookingRequestOfferEventCreate & { createdAt: Date }> {
    const row = {
        bookingRequestOfferEventId: idCreate(),
        bookingRequestOfferId: input.bookingRequestOfferId,
        type: 'USER_MESSAGE_SIMPLE' as const,
        payload: { messageBody: input.initialMessage },
        createdAt: new Date(input.cookCreatedAt.getTime() - 1),
    };
    await db.insert(bookingRequestOfferEvents).values(row);
    return row;
}

/**
 * Persist the booking-request message as the offer-chat opener when missing
 * (new offers seed on create; older offers heal on first messages load).
 */
export async function bookingRequestOfferInitialChatMessageEnsure(
    db: DbInserter,
    input: {
        bookingRequestOfferId: string;
        bookingRequest: { originalMessage: string; adjustedMessage: string | null };
        events: BookingRequestOfferEvent[];
        fallbackCreatedAt?: Date;
    },
): Promise<BookingRequestOfferEvent[]> {
    const initialMessage = bookingRequestOfferInitialMessageResolve(input.bookingRequest);
    if (bookingRequestOfferInitialChatMessageAlreadySeeded(input.events, initialMessage)) {
        return input.events;
    }

    const cookCreatedAt =
        input.events.find((event) => event.type === 'COOK_CREATED')?.createdAt ??
        input.events[0]?.createdAt ??
        input.fallbackCreatedAt ??
        new Date();

    const row = await bookingRequestOfferInitialChatMessageInsert(db, {
        bookingRequestOfferId: input.bookingRequestOfferId,
        initialMessage,
        cookCreatedAt,
    });

    const seeded: BookingRequestOfferEvent = {
        bookingRequestOfferEventId: row.bookingRequestOfferEventId,
        bookingRequestOfferId: row.bookingRequestOfferId,
        type: row.type,
        payload: row.payload,
        createdAt: row.createdAt,
    };
    return [...input.events, seeded].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
