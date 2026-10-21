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

type PeerStreakMessage = {
    __typename?: string;
    isOwn?: boolean;
    author?: { display: string };
};

function isUserMessage(message: PeerStreakMessage | undefined): message is PeerStreakMessage & {
    __typename: 'ChatMessageUser';
    isOwn: boolean;
} {
    return Boolean(message && message.__typename === 'ChatMessageUser' && typeof message.isOwn === 'boolean');
}

function sameAuthor(a: PeerStreakMessage, b: PeerStreakMessage): boolean {
    // PublicUser has no id — display is the stable chrome key on human threads.
    return (a.author?.display ?? '') === (b.author?.display ?? '');
}

function sameRail(a: PeerStreakMessage, b: PeerStreakMessage): boolean {
    return a.isOwn === b.isOwn;
}

/**
 * Streak chrome for consecutive same-author human bubbles on the same rail
 * (offer/support/WhatsApp). Peer rail: name on first, avatar on last. Own rail:
 * name flags only (avatars stay off in the bubble view).
 */
export function peerUserMessageStreak(
    messages: ReadonlyArray<PeerStreakMessage>,
    index: number,
): { showName: boolean; showAvatar: boolean; continued: boolean } {
    const current = messages[index];
    if (!isUserMessage(current)) {
        return { showName: true, showAvatar: true, continued: false };
    }
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const continued = isUserMessage(prev) && sameRail(prev, current) && sameAuthor(prev, current);
    const followed = isUserMessage(next) && sameRail(next, current) && sameAuthor(next, current);
    return {
        showName: !continued,
        showAvatar: current.isOwn ? false : !followed,
        continued,
    };
}
