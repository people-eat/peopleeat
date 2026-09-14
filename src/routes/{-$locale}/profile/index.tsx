import { createFileRoute } from '@tanstack/react-router';

import { profileHomePreload } from '../../../web/pages/profile/profileShellPreload';
import { ProfilePage } from '../../../web/pages/ProfilePage';

export const Route = createFileRoute('/{-$locale}/profile/')({
    loader: async ({ parentMatchPromise }) => {
        const parent = await parentMatchPromise;
        const user = parent.loaderData?.currentSession.user;
        if (user) {
            await profileHomePreload(Boolean(user.cook));
        }
    },
    component: ProfilePage,
});
