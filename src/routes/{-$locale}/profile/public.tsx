import { createFileRoute, redirect } from '@tanstack/react-router';

import { parseProfileCookChefProfileSearch } from '../../../web/pages/profile/ProfileCookChefProfilePage';

export const Route = createFileRoute('/{-$locale}/profile/public')({
    beforeLoad: ({ params, search }) => {
        throw redirect({
            to: '/{-$locale}/profile/chef-profile',
            params: { locale: params.locale },
            search: parseProfileCookChefProfileSearch(search),
            replace: true,
        });
    },
});
