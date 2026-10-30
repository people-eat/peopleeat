import { describe, expect, it } from 'vitest';

import {
    cookAttentionCopy,
    cookOnboardingStepCopy,
    userAttentionCopy,
    userAttentionKindBadgeLabel,
    userAttentionKindTone,
} from './attentionCopy';
import { DEFAULT_TIME_ZONE } from './timeZone';

const call = { callStartAt: '2099-06-01T16:00:00.000Z', callEndAt: '2099-06-01T16:15:00.000Z' };

describe('userAttentionCopy', () => {
    it('switches between singular and plural for offers to review', () => {
        // Act
        const single = userAttentionCopy({ kind: 'OFFERS_TO_REVIEW', count: 1, occasion: 'Birthday' }, 'en', DEFAULT_TIME_ZONE);
        const multiple = userAttentionCopy({ kind: 'OFFERS_TO_REVIEW', count: 3, occasion: 'Birthday' }, 'de', DEFAULT_TIME_ZONE);

        // Assert
        expect(single).toEqual({
            title: 'An offer is waiting for your decision',
            body: 'Compare the proposals and accept one when it feels right.',
            actionLabel: 'Review offers',
        });
        expect(multiple.title).toBe('3 Anfragen mit Angeboten zum Prüfen');
        expect(multiple.actionLabel).toBe('Zu den Anfragen');
    });

    it('names the occasion for payment and review items', () => {
        // Act
        const payment = userAttentionCopy({ kind: 'PAYMENT_DUE', count: 1, occasion: 'Team dinner' }, 'en', DEFAULT_TIME_ZONE);
        const review = userAttentionCopy({ kind: 'TESTIMONIAL_MISSING', count: 1, occasion: 'Past dinner' }, 'de', DEFAULT_TIME_ZONE);

        // Assert
        expect(payment.body).toBe('Team dinner: add your payment details to confirm the dinner.');
        expect(review.body).toBe('Past dinner: teile kurz, wie das Dinner war.');
    });

    it('formats the call window into call bodies', () => {
        // Act
        const responseNeeded = userAttentionCopy(
            { kind: 'CALL_RESPONSE_NEEDED', count: 1, occasion: 'x', ...call },
            'en',
            DEFAULT_TIME_ZONE,
        );
        const confirmed = userAttentionCopy({ kind: 'CALL_CONFIRMED', count: 1, occasion: 'x', ...call }, 'de', DEFAULT_TIME_ZONE);

        // Assert
        expect(responseNeeded.title).toBe('Call suggestion awaits your response');
        expect(responseNeeded.body).toMatch(/^Call suggestion awaiting your response · .+–.+$/);
        expect(confirmed.title).toBe('Bevorstehender Call');
        expect(confirmed.body).toMatch(/^Gesprächstermin bestätigt · .+ Uhr$/);
    });

    it('marks only actionable kinds as warnings and gives call kinds one badge', () => {
        // Assert
        expect(userAttentionKindTone('CALL_RESPONSE_NEEDED')).toBe('warning');
        expect(userAttentionKindTone('CALL_PENDING')).toBe('info');
        expect(userAttentionKindTone('TESTIMONIAL_MISSING')).toBe('info');
        expect(userAttentionKindBadgeLabel('CALL_PENDING', 'en')).toBe(userAttentionKindBadgeLabel('CALL_CONFIRMED', 'en'));
    });
});

describe('cookAttentionCopy', () => {
    it('has no action while approval is pending', () => {
        // Act
        const copy = cookAttentionCopy({ kind: 'APPROVAL_PENDING', count: 1 }, 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(copy.actionLabel).toBeNull();
    });

    it('names the customer and time of the upcoming call', () => {
        // Act
        const copy = cookAttentionCopy(
            { kind: 'CALL_UPCOMING', count: 1, callStartAt: call.callStartAt, customerDisplay: 'Ada' },
            'de',
            DEFAULT_TIME_ZONE,
        );

        // Assert
        expect(copy.body).toMatch(/^Ada · .+ · .+ Uhr$/);
        expect(copy.actionLabel).toBe('Zum Angebot');
    });

    it('uses the shared unread wording', () => {
        // Act
        const copy = cookAttentionCopy({ kind: 'OFFER_CHAT_UNREAD', count: 2 }, 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(copy.title).toBe('2 new messages in offer chats');
    });
});

describe('cookOnboardingStepCopy', () => {
    it('gives every step its own title', () => {
        // Act
        const titles = (['WALLET', 'TRAVEL', 'PROFILE_PICTURE', 'CHEF_PROFILE', 'FIRST_MEAL', 'FIRST_MENU', 'FIRST_OFFER'] as const).map(
            (step) => cookOnboardingStepCopy(step, 'de').title,
        );

        // Assert
        expect(new Set(titles).size).toBe(titles.length);
    });
});
