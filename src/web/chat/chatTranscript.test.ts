import { describe, expect, it } from 'vitest';

import { peerUserMessageStreak } from './chatTranscript';

function peer(display: string) {
    return {
        __typename: 'ChatMessageUser' as const,
        isOwn: false as const,
        author: { display },
    };
}

function own(display: string) {
    return {
        __typename: 'ChatMessageUser' as const,
        isOwn: true as const,
        author: { display },
    };
}

const milestone = { __typename: 'ChatMessageBookingRequestOfferEvent' as const };

describe('peerUserMessageStreak', () => {
    it('starts a new streak when the peer author changes', () => {
        const messages = [peer('Guest'), peer('Chef'), peer('Chef')];

        expect(peerUserMessageStreak(messages, 0)).toEqual({ showName: true, showAvatar: true, continued: false });
        expect(peerUserMessageStreak(messages, 1)).toEqual({ showName: true, showAvatar: false, continued: false });
        expect(peerUserMessageStreak(messages, 2)).toEqual({ showName: false, showAvatar: true, continued: true });
    });

    it('does not continue a streak across a milestone between same-author peers', () => {
        const messages = [peer('Guest'), milestone, peer('Guest')];

        expect(peerUserMessageStreak(messages, 0)).toEqual({ showName: true, showAvatar: true, continued: false });
        expect(peerUserMessageStreak(messages, 2)).toEqual({ showName: true, showAvatar: true, continued: false });
    });

    it('does not continue a peer streak across an own bubble', () => {
        const messages = [peer('Guest'), own('Admin'), peer('Guest')];

        expect(peerUserMessageStreak(messages, 1)).toEqual({ showName: true, showAvatar: false, continued: false });
        expect(peerUserMessageStreak(messages, 2)).toEqual({ showName: true, showAvatar: true, continued: false });
    });
});
