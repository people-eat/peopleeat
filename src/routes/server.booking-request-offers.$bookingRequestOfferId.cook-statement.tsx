import { createFileRoute, notFound } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';

import type { BookingRequestOfferCookStatementPageProps } from '../web/pages/BookingRequestOfferPaymentDocumentPage';
import { BookingRequestOfferPaymentDocumentPage } from '../web/pages/BookingRequestOfferPaymentDocumentPage';

// Headless Chromium capture target for the cook payout statement.
// Authenticated via short-lived HMAC `?token=` (see browser-capture.md).

const cookStatementLoad: (input: { bookingRequestOfferId: string; token: string }) => Promise<BookingRequestOfferCookStatementPageProps> =
    createIsomorphicFn()
        .server(async (input: { bookingRequestOfferId: string; token: string }): Promise<BookingRequestOfferCookStatementPageProps> => {
            const { bookingRequestOfferPaymentDocumentLoadServer } =
                await import('../server/utils/bookingRequestOfferPaymentDocumentLoadServer');
            const loaded = await bookingRequestOfferPaymentDocumentLoadServer(input);
            return loaded.cook;
        })
        .client(async (): Promise<BookingRequestOfferCookStatementPageProps> => {
            throw notFound();
        });

export const Route = createFileRoute('/server/booking-request-offers/$bookingRequestOfferId/cook-statement')({
    staleTime: Infinity,
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === 'string' ? search.token : '',
    }),
    loaderDeps: ({ search }) => ({ token: search.token }),
    loader: ({ params, deps }) => cookStatementLoad({ bookingRequestOfferId: params.bookingRequestOfferId, token: deps.token }),
    head: () => ({
        meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    }),
    component() {
        return <BookingRequestOfferPaymentDocumentPage {...Route.useLoaderData()} />;
    },
});
