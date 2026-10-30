import type { CookAttentionKind, CookOnboardingStep } from '../../shared/attentionCopy';
import { cookAttentionCopy, cookAttentionKindTone, cookOnboardingStepCopy } from '../../shared/attentionCopy';
import type { Locale } from '../../shared/locale';
import type { GqlCProfilePageCookStatusFragment } from '../graphql/generated';

type CookOverviewAttentionAction =
    | { to: '/{-$locale}/profile/wallet' }
    | {
          to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId';
          bookingRequestOfferId: string;
          search?: { tab: 'chat' };
      };

export type CookOverviewAttentionItem = {
    kind: CookAttentionKind;
    tone: 'info' | 'warning';
    title: string;
    body: string;
    action: (CookOverviewAttentionAction & { label: string }) | null;
};

type CookOverviewGettingStartedHref =
    | '/{-$locale}/profile/wallet'
    | '/{-$locale}/profile/travel'
    | '/{-$locale}/profile/chef-profile/edit'
    | '/{-$locale}/profile/meals'
    | '/{-$locale}/profile/menus'
    | '/{-$locale}/profile/booking-request-pool';

export type CookOverviewGettingStartedStep = {
    step: CookOnboardingStep;
    title: string;
    body: string;
    href: CookOverviewGettingStartedHref;
    actionLabel: string;
};

type CookOverviewModel = {
    attention: CookOverviewAttentionItem[];
    gettingStarted: CookOverviewGettingStartedStep[];
    allClear: boolean;
};

const onboardingStepHref: Record<CookOnboardingStep, CookOverviewGettingStartedHref> = {
    WALLET: '/{-$locale}/profile/wallet',
    TRAVEL: '/{-$locale}/profile/travel',
    PROFILE_PICTURE: '/{-$locale}/profile/chef-profile/edit',
    CHEF_PROFILE: '/{-$locale}/profile/chef-profile/edit',
    FIRST_MEAL: '/{-$locale}/profile/meals',
    FIRST_MENU: '/{-$locale}/profile/menus',
    FIRST_OFFER: '/{-$locale}/profile/booking-request-pool',
};

function attentionAction(item: GqlCProfilePageCookStatusFragment['attention'][number]): CookOverviewAttentionAction | null {
    switch (item.kind) {
        case 'APPROVAL_PENDING':
            return null;
        case 'WALLET_RESET':
            return { to: '/{-$locale}/profile/wallet' };
        case 'OFFER_CHAT_UNREAD':
        case 'CALL_UPCOMING':
            if (item.bookingRequestOfferId == null) return null;
            return {
                to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
                bookingRequestOfferId: item.bookingRequestOfferId,
                search: item.kind === 'OFFER_CHAT_UNREAD' ? { tab: 'chat' } : undefined,
            };
    }
}

/** Attaches cook routes to the server-ranked `attention` / `onboardingSteps` (see docs/architecture/attention.md). */
export function profilePageCookOverview(cook: GqlCProfilePageCookStatusFragment, locale: Locale, timeZone: string): CookOverviewModel {
    const attention = cook.attention.map((item): CookOverviewAttentionItem => {
        const copy = cookAttentionCopy(item, locale, timeZone);
        const action = attentionAction(item);
        return {
            kind: item.kind,
            tone: cookAttentionKindTone(item.kind),
            title: copy.title,
            body: copy.body,
            action: action != null && copy.actionLabel != null ? { ...action, label: copy.actionLabel } : null,
        };
    });

    const gettingStarted = cook.onboardingSteps.map((step): CookOverviewGettingStartedStep => ({
        step,
        ...cookOnboardingStepCopy(step, locale),
        href: onboardingStepHref[step],
    }));

    return {
        attention,
        gettingStarted,
        allClear: attention.length === 0 && gettingStarted.length === 0,
    };
}
