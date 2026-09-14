import { createFileRoute } from '@tanstack/react-router';

import { ProfileCustomerSupportRequestPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCustomerSupportRequestPage,
    profileCustomerSupportRequestPageDescription,
    profileCustomerSupportRequestPageTitle,
    profileCustomerSupportRequestPageVariables,
} from '../../../web/pages/profile/ProfileCustomerSupportRequestPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/support-requests_/$supportRequestId')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(
            ProfileCustomerSupportRequestPageDocument,
            profileCustomerSupportRequestPageVariables(params.supportRequestId),
        )(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCustomerSupportRequestPageTitle[locale],
            description: profileCustomerSupportRequestPageDescription[locale],
            path: `/profile/support-requests/${params.supportRequestId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { supportRequestId } = Route.useParams();
        return (
            <ProfileCustomerSupportRequestPage key={supportRequestId} data={Route.useLoaderData()} supportRequestId={supportRequestId} />
        );
    },
});
