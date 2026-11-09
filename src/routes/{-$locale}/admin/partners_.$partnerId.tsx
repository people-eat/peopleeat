import { createFileRoute, redirect } from '@tanstack/react-router';

import { DEFAULT_LOCALE, localeFromParam } from '../../../web/utils/locale';

/** Legacy editor path. Migrated venue ids match the old partner ids. */
export const Route = createFileRoute('/{-$locale}/admin/partners_/$partnerId')({
    beforeLoad: ({ params }) => {
        const locale = localeFromParam(params);
        const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
        throw redirect({ href: `${prefix}/admin/partner-venues/${params.partnerId}`, statusCode: 301 });
    },
});
