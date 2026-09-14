import type { GqlCChatTurnFieldsFragment } from '../graphql/generated';

export type TranscriptTurn = GqlCChatTurnFieldsFragment;

/** Re-group by ISO calendar day (YYYY-MM-DD). */
export function groupMessagesByDate<TMessage extends { createdAt: string }>(
    messages: ReadonlyArray<TMessage>,
): Array<{ date: string; messages: ReadonlyArray<TMessage> }> {
    const groups: Array<{ date: string; messages: TMessage[] }> = [];
    let lastDate: string | null = null;
    for (const message of messages) {
        const date = message.createdAt.slice(0, 10);
        if (date !== lastDate) {
            groups.push({ date, messages: [] });
            lastDate = date;
        }
        groups[groups.length - 1]!.messages.push(message);
    }
    return groups;
}

/** Flatten turns into transcript rows (user then assistant) for day grouping. */
export function transcriptRowsFromTurns(turns: ReadonlyArray<TranscriptTurn>): Array<{
    key: string;
    createdAt: string;
    turn: TranscriptTurn;
    role: 'user' | 'assistant';
}> {
    const rows: Array<{ key: string; createdAt: string; turn: TranscriptTurn; role: 'user' | 'assistant' }> = [];
    for (const turn of turns) {
        rows.push({ key: `${turn.chatTurnId}-user`, createdAt: turn.userMessage.createdAt, turn, role: 'user' });
        rows.push({
            key: `${turn.chatTurnId}-assistant`,
            createdAt: turn.assistantMessage.createdAt,
            turn,
            role: 'assistant',
        });
    }
    return rows;
}

/** Peer streak chrome for consecutive human user bubbles (offer/support). */
export function peerUserMessageStreak(
    messages: ReadonlyArray<{ __typename?: string; isOwn?: boolean }>,
    index: number,
): { showName: boolean; showAvatar: boolean; continued: boolean } {
    const current = messages[index];
    if (!current || current.__typename !== 'ChatMessageUser' || current.isOwn) {
        return { showName: true, showAvatar: true, continued: false };
    }
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const continued = Boolean(prev && prev.__typename === 'ChatMessageUser' && prev.isOwn === false);
    const followed = Boolean(next && next.__typename === 'ChatMessageUser' && next.isOwn === false);
    return {
        showName: !continued,
        showAvatar: !followed,
        continued,
    };
}
