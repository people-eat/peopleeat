import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClient } from 'urql';

import { ChatTurnUpdatesDocument } from '../graphql/generated';
import type { GqlCChatTurnFieldsFragment, GqlCChatTurnUpdatesSubscription } from '../graphql/generated';

type ChatTurnUpdate = GqlCChatTurnUpdatesSubscription['chatTurnUpdates'];

/**
 * Chat-scoped live updates: seed from query turns, then merge snapshot/upsert
 * by revision (accept only greater revision).
 */
export function useChatTurnLiveUpdates(chatId: string | null | undefined, seedTurns: GqlCChatTurnFieldsFragment[]) {
    const [turnsById, setTurnsById] = useState<Map<string, GqlCChatTurnFieldsFragment>>(() => mapFromTurns(seedTurns));
    // Callers often pass `chat?.turns ?? []`. Re-seed only when chatId or turn
    // content/revision identity changes — not when the array reference churns.
    const seedKey = seedTurns.map((t) => `${t.chatTurnId}:${t.revision}`).join('|');
    const seedTurnsRef = useRef(seedTurns);
    seedTurnsRef.current = seedTurns;

    useEffect(() => {
        setTurnsById(mapFromTurns(seedTurnsRef.current));
    }, [chatId, seedKey]);

    const mergeUpdate = useCallback((update: ChatTurnUpdate) => {
        setTurnsById((prev) => {
            const next = new Map(prev);
            if (update.__typename === 'ChatTurnSnapshot') {
                for (const turn of update.turns) {
                    const existing = next.get(turn.chatTurnId);
                    if (!existing || turn.revision > existing.revision) {
                        next.set(turn.chatTurnId, turn);
                    }
                }
                return next;
            }
            const turn = update.turn;
            const existing = next.get(turn.chatTurnId);
            if (!existing || turn.revision > existing.revision) {
                next.set(turn.chatTurnId, turn);
            }
            return next;
        });
    }, []);

    const client = useClient();
    useEffect(() => {
        if (!chatId) return;
        const { unsubscribe } = client.subscription(ChatTurnUpdatesDocument, { chatId }).subscribe((result) => {
            if (result.data?.chatTurnUpdates) {
                mergeUpdate(result.data.chatTurnUpdates);
            }
        });
        return () => unsubscribe();
    }, [client, chatId, mergeUpdate]);

    const turns = useMemo(() => [...turnsById.values()].sort((a, b) => a.sequence - b.sequence), [turnsById]);

    const activeTurn = useMemo(
        () => turns.find((t) => t.status === 'QUEUED' || t.status === 'RUNNING' || t.status === 'AWAITING_INPUT') ?? null,
        [turns],
    );

    return { turns, activeTurn };
}

function mapFromTurns(turns: GqlCChatTurnFieldsFragment[]): Map<string, GqlCChatTurnFieldsFragment> {
    const map = new Map<string, GqlCChatTurnFieldsFragment>();
    for (const turn of turns) {
        map.set(turn.chatTurnId, turn);
    }
    return map;
}
