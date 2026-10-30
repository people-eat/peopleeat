import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

import { featureToggleIsActive } from '../../../shared/featureToggle';
import { ProfileBanStatusUpdatesDocument } from '../../graphql/generated';
import type { GqlCProfilePageQuery } from '../../graphql/generated';
import { FeatureToggleKeysProvider } from '../../hooks/useFeatureToggleActive';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { ProfileBanBanner } from './ProfileBanBanner';

// Profile shell — cooks and customers get a floating sidebar. Account lives at
// `/profile/account` as a normal Outlet child. Cook-only sub-routes show
// `CookAccessDenied` for non-cooks. See `docs/features/profile.md`,
// `docs/features/cook-shell.md`, and `docs/features/customer-shell.md`.
//
// Cook and customer shells are separate lazy chunks so a customer session never
// downloads cook nav/breadcrumb modules (and vice versa). The matching route
// loader awaits `profileShellPreload` first so NavigationProgress covers the
// download — do not rely on this Suspense boundary for first paint.

const ProfileCookShell = lazy(async () => {
    const mod = await import('./ProfileCookShell');
    return { default: mod.ProfileCookShell };
});
const ProfileCustomerShell = lazy(async () => {
    const mod = await import('./ProfileCustomerShell');
    return { default: mod.ProfileCustomerShell };
});

export function ProfileLayout({ loaderData }: { loaderData: GqlCProfilePageQuery }) {
    const seedUser = loaderData.currentSession.user;
    // Seed from the loader user (stable identity). Do not wrap `{ userId, status }`
    // inline — a new object each render re-triggers useUserUpdatesSeed's setState
    // and hits "Maximum update depth exceeded" on every profile page.
    const banStatusUser = useUserUpdatesSeed(seedUser, ProfileBanStatusUpdatesDocument);
    const user = seedUser;
    if (!user) {
        // Route loader redirects unsigned sessions; this is a type/fallback guard.
        return null;
    }

    const isAdmin = Boolean(user.admin);
    const activeFeatureToggleKeys = loaderData.currentSession.activeFeatureToggleKeys;
    const isBanned = (banStatusUser?.status ?? user.status) === 'BANNED';
    const banner: ReactNode = isBanned ? <ProfileBanBanner /> : null;

    let shell;
    if (user.cook) {
        const { attentionCounts } = user.cook;
        shell = (
            <Suspense fallback={null}>
                <ProfileCookShell
                    isAdmin={isAdmin}
                    walletBadge={attentionCounts.walletNeedsAttention}
                    poolReviewCount={attentionCounts.bookingRequestPoolCount}
                    offersUnreadCount={attentionCounts.bookingRequestOfferUnreadCount}
                    assistantEnabled={featureToggleIsActive(activeFeatureToggleKeys, 'ASSISTANT_COOK')}
                    banner={banner}
                />
            </Suspense>
        );
    } else {
        shell = (
            <Suspense fallback={null}>
                <ProfileCustomerShell
                    isAdmin={isAdmin}
                    supportUnreadCount={user.attentionCounts?.supportRequestUnreadCount ?? 0}
                    assistantEnabled={featureToggleIsActive(activeFeatureToggleKeys, 'ASSISTANT_CUSTOMER')}
                    banner={banner}
                />
            </Suspense>
        );
    }

    return <FeatureToggleKeysProvider value={activeFeatureToggleKeys}>{shell}</FeatureToggleKeysProvider>;
}
