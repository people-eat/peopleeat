import { createFileRoute, notFound } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';

import type { BookingRequestOfferCustomerReceiptPageProps } from '../web/pages/BookingRequestOfferPaymentDocumentPage';
import { BookingRequestOfferPaymentDocumentPage } from '../web/pages/BookingRequestOfferPaymentDocumentPage';

// Headless Chromium capture target for the customer payment receipt.
// Authenticated via short-lived HMAC `?token=` (see browser-capture.md).

const customerReceiptLoad: (input: {
    bookingRequestOfferId: string;
    token: string;
}) => Promise<BookingRequestOfferCustomerReceiptPageProps> = createIsomorphicFn()
    .server(async (input: { bookingRequestOfferId: string; token: string }): Promise<BookingRequestOfferCustomerReceiptPageProps> => {
        const { bookingRequestOfferPaymentDocumentLoadServer } =
            await import('../server/utils/bookingRequestOfferPaymentDocumentLoadServer');
        const loaded = await bookingRequestOfferPaymentDocumentLoadServer(input);
        return loaded.customer;
    })
    .client(async (): Promise<BookingRequestOfferCustomerReceiptPageProps> => {
        throw notFound();
    });

export const Route = createFileRoute('/server/booking-request-offers/$bookingRequestOfferId/customer-receipt')({
    staleTime: Infinity,
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === 'string' ? search.token : '',
    }),
    loaderDeps: ({ search }) => ({ token: search.token }),
    loader: ({ params, deps }) => customerReceiptLoad({ bookingRequestOfferId: params.bookingRequestOfferId, token: deps.token }),
    head: () => ({
        meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    }),
    component() {
        return <BookingRequestOfferPaymentDocumentPage {...Route.useLoaderData()} />;
    },
});
