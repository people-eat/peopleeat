import { createFileRoute, notFound } from '@tanstack/react-router';

import { ProfileCookBookingRequestPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    ProfileCookBookingRequestPage,
    profileCookBookingRequestPageDescription,
    profileCookBookingRequestPageTitle,
} from '../../../web/pages/profile/ProfileCookBookingRequestPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/profile/booking-request-pool_/$bookingRequestId')({
    loader: async ({ params }) => {
        const data = await routeLoaderGraphqlClient(ProfileCookBookingRequestPageDocument, {
            bookingRequestId: params.bookingRequestId,
        })();
        const cook = data.currentSession.user?.cook ?? null;
        const lookup = cook?.bookingRequestLookup ?? null;
        if (!cook || lookup == null || lookup.__typename === 'CookBookingRequestNotFound') {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: profileCookBookingRequestPageTitle[locale],
            description: profileCookBookingRequestPageDescription[locale],
            path: `/profile/booking-request-pool/${params.bookingRequestId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId } = Route.useParams();
        return <ProfileCookBookingRequestPage key={bookingRequestId} data={Route.useLoaderData()} bookingRequestId={bookingRequestId} />;
    },
});
