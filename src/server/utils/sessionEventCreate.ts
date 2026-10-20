import { idCreate } from '../../shared/idCreate';
import type { SessionEventCreate } from '../db/schema';
import { sessionEvents } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { SessionEventKeyEmitted, SessionEventPayload } from '../domain/sessionEvent';

/**
 * Typed insert for `SessionEvents`. Never insert into `sessionEvents` directly —
 * this helper keeps key ↔ payload coupling compile-time safe.
 *
 * Only accepts keys peopleeat still emits (`SessionEventKeyEmitted`). Historical
 * keys in `sessionEventKeysNoLongerProduced` stay in the taxonomy for admin
 * timelines but are never written here.
 */
export async function sessionEventCreate<TKey extends SessionEventKeyEmitted>(
    serverRuntime: ServerRuntime,
    event: {
        sessionId: string;
        type: TKey;
        payload: SessionEventPayload<TKey>;
    },
): Promise<{ sessionEventId: string }> {
    const sessionEventId = idCreate();
    const row: SessionEventCreate = {
        sessionEventId,
        sessionId: event.sessionId,
        type: event.type,
        payload: event.payload,
    };
    await serverRuntime.db.insert(sessionEvents).values(row);
    return { sessionEventId };
}
