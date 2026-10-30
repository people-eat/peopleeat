import type { CookAttentionKind, CookOnboardingStep } from '../../shared/attentionCopy';
import type { CookStripeStatus } from '../../shared/cookStripe';

export type CookAttentionItem = {
    kind: CookAttentionKind;
    count: number;
    bookingRequestOfferId: string | null;
    callStartAt: Date | null;
    customerDisplay: string | null;
};

function item(kind: CookAttentionKind, overrides: Partial<Omit<CookAttentionItem, 'kind'>> = {}): CookAttentionItem {
    return { kind, count: 1, bookingRequestOfferId: null, callStartAt: null, customerDisplay: null, ...overrides };
}

/**
 * Cook overview to-dos, highest priority first: approval pending → wallet reset
 * → unread offer chat → next discovery call. `offers` newest first; unread
 * ties resolve to the earlier entry.
 */
export function cookAttentionDerive(input: {
    isApprovedByAdmin: boolean;
    stripeStatus: CookStripeStatus;
    offers: readonly { bookingRequestOfferId: string; cookUnreadNotificationCount: number }[];
    nextCall: { bookingRequestOfferId: string; startAt: Date; customerDisplay: string } | null;
}): CookAttentionItem[] {
    const items: CookAttentionItem[] = [];

    if (!input.isApprovedByAdmin) {
        items.push(item('APPROVAL_PENDING'));
    }
    if (input.isApprovedByAdmin && input.stripeStatus === 'ACTIVE_WAS_RESET') {
        items.push(item('WALLET_RESET'));
    }

    let unreadTotal = 0;
    let unreadBest: { offerId: string; count: number } | null = null;
    for (const offer of input.offers) {
        if (offer.cookUnreadNotificationCount <= 0) continue;
        unreadTotal += offer.cookUnreadNotificationCount;
        if (unreadBest == null || offer.cookUnreadNotificationCount > unreadBest.count) {
            unreadBest = { offerId: offer.bookingRequestOfferId, count: offer.cookUnreadNotificationCount };
        }
    }
    if (unreadBest) {
        items.push(item('OFFER_CHAT_UNREAD', { count: unreadTotal, bookingRequestOfferId: unreadBest.offerId }));
    }

    if (input.nextCall) {
        items.push(
            item('CALL_UPCOMING', {
                bookingRequestOfferId: input.nextCall.bookingRequestOfferId,
                callStartAt: input.nextCall.startAt,
                customerDisplay: input.nextCall.customerDisplay,
            }),
        );
    }

    return items;
}

/** Remaining cook setup steps in display order. Wallet and first offer wait for admin approval. */
export function cookOnboardingStepsDerive(input: {
    isApprovedByAdmin: boolean;
    stripeStatus: CookStripeStatus;
    hasTravelOrigin: boolean;
    hasProfilePicture: boolean;
    biography: string;
    cuisineStyle: string | null;
    cookingPhilosophy: string | null;
    mealCount: number;
    menuCount: number;
    offerCount: number;
}): CookOnboardingStep[] {
    const steps: CookOnboardingStep[] = [];
    const profileComplete =
        input.biography.trim().length > 0 &&
        input.cuisineStyle != null &&
        input.cuisineStyle !== '' &&
        input.cookingPhilosophy != null &&
        input.cookingPhilosophy !== '';

    if (input.isApprovedByAdmin && (input.stripeStatus === 'EMPTY' || input.stripeStatus === 'PREPARED')) steps.push('WALLET');
    if (!input.hasTravelOrigin) steps.push('TRAVEL');
    if (!input.hasProfilePicture) steps.push('PROFILE_PICTURE');
    if (!profileComplete) steps.push('CHEF_PROFILE');
    if (input.mealCount === 0) steps.push('FIRST_MEAL');
    if (input.menuCount === 0) steps.push('FIRST_MENU');
    if (input.isApprovedByAdmin && input.stripeStatus === 'COMPLETED' && input.offerCount === 0) steps.push('FIRST_OFFER');

    return steps;
}
