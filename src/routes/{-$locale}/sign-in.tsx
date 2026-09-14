import { createFileRoute, redirect } from '@tanstack/react-router';

import { localeFromParam } from '../../web/utils/locale';
import { parseSignInSearch } from '../../web/utils/returnTo';

/** Legacy path — keep bookmarks working by sending visitors to `/log-on`. */
export const Route = createFileRoute('/{-$locale}/sign-in')({
    validateSearch: (search: Record<string, unknown>) => parseSignInSearch(search),
    beforeLoad: ({ params, search }) => {
        throw redirect({
            to: '/{-$locale}/log-on',
            params: { locale: params.locale },
            search: search.returnTo ? { returnTo: search.returnTo } : {},
            replace: true,
        });
    },
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return {
            meta: [{ name: 'robots', content: 'noindex' }],
            links: [{ rel: 'canonical', href: locale === 'en' ? '/en/log-on' : '/log-on' }],
        };
    },
});
