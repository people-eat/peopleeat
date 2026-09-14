import { createFileRoute, redirect } from '@tanstack/react-router';

import { BookingRequestSubmittedPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import {
    BookingRequestSubmittedPage,
    bookingRequestSubmittedPageDescription,
    bookingRequestSubmittedPageTitle,
    bookingRequestSubmittedPageVariables,
} from '../../web/pages/BookingRequestSubmittedPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/booking-request_/$bookingRequestId_/submitted')({
    loader: async ({ params }) => {
        const data = await routeLoaderGraphqlClient(
            BookingRequestSubmittedPageDocument,
            bookingRequestSubmittedPageVariables(params.bookingRequestId),
        )();
        if (!data.currentSession.user?.bookingRequest) {
            throw redirect({
                to: '/{-$locale}/booking-request/form',
                params: { locale: params.locale },
            });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: bookingRequestSubmittedPageTitle[locale],
            description: bookingRequestSubmittedPageDescription[locale],
            path: `/booking-request/${params.bookingRequestId}/submitted`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestId } = Route.useParams();
        return <BookingRequestSubmittedPage data={Route.useLoaderData()} bookingRequestId={bookingRequestId} />;
    },
});
