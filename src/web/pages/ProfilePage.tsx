import { getRouteApi } from '@tanstack/react-router';
import { lazy, Suspense, useState } from 'react';

import { ProfilePageUpdatesDocument } from '../graphql/generated';
import { useUserUpdatesSeed } from '../hooks/useUserUpdatesSeed';
import { profilePageCookOverviewVariables } from './profilePageCookOverviewVariables';

const ProfilePageCook = lazy(async () => {
    const mod = await import('./ProfilePageCook');
    return { default: mod.ProfilePageCook };
});
const ProfilePageCustomer = lazy(async () => {
    const mod = await import('./ProfilePageCustomer');
    return { default: mod.ProfilePageCustomer };
});

const profileRouteApi = getRouteApi('/{-$locale}/profile');

export function ProfilePage() {
    const loaderData = profileRouteApi.useLoaderData();
    const seedUser = loaderData.currentSession.user ?? null;
    const [overviewVariables] = useState(profilePageCookOverviewVariables);
    const user = useUserUpdatesSeed(seedUser, ProfilePageUpdatesDocument, overviewVariables);
    if (!user) {
        // Route loader redirects unsigned sessions; this is a type/fallback guard.
        return null;
    }

    const firstName = user.firstName.trim();

    return (
        <Suspense fallback={null}>
            {user.cook ? (
                <ProfilePageCook name={firstName} profilePictureUrl={user.profilePicture?.url ?? null} cook={user.cook} />
            ) : (
                <ProfilePageCustomer name={firstName} user={user} />
            )}
        </Suspense>
    );
}
