import { createFileRoute, redirect } from '@tanstack/react-router';

import { DEFAULT_LOCALE, localeFromParam } from '../../web/utils/locale';

/** Legacy path — send visitors to `/venues`. */
export const Route = createFileRoute('/{-$locale}/partners')({
    beforeLoad: ({ params }) => {
        const locale = localeFromParam(params);
        const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
        throw redirect({ href: `${prefix}/venues`, statusCode: 301 });
    },
});
