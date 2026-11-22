import { createFileRoute, redirect } from '@tanstack/react-router';

import { DEFAULT_LOCALE, localeFromParam } from '../../../web/utils/locale';

/** Legacy path — send cooks to `/profile/finances` (keeps Stripe return/refresh bookmarks working). */
export const Route = createFileRoute('/{-$locale}/profile/wallet')({
    validateSearch: (search: Record<string, unknown>) => search,
    beforeLoad: ({ params, search }) => {
        const locale = localeFromParam(params);
        const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(search)) {
            if (value === undefined || value === null) continue;
            query.set(key, String(value));
        }
        const qs = query.toString();
        throw redirect({
            href: `${prefix}/profile/finances${qs ? `?${qs}` : ''}`,
            statusCode: 301,
        });
    },
});
