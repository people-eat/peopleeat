import { createFileRoute, notFound } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';

import type { GiftCardReceiptPageProps } from '../web/pages/GiftCardReceiptPage';
import { GiftCardReceiptPage } from '../web/pages/GiftCardReceiptPage';

// Headless Chromium capture target for gift-card purchase receipts.
// Authenticated via short-lived HMAC `?token=` (see browser-capture.md).
// URL: `/server/gift-cards/:giftCardId/receipt?token=…`
//
// DB / token verification live in `giftCardReceiptLoadServer` and are loaded
// only from `.server(…)`. This route ships a client component (via
// `routeTree.gen.ts`); a top-level `db` import would pull `pg` into the
// browser (`Buffer is not defined`) and break the app shell.

const giftCardReceiptLoad: (input: { giftCardId: string; token: string }) => Promise<GiftCardReceiptPageProps> = createIsomorphicFn()
    .server(async (input: { giftCardId: string; token: string }): Promise<GiftCardReceiptPageProps> => {
        const { giftCardReceiptLoadServer } = await import('../server/utils/giftCardReceiptLoadServer');
        return giftCardReceiptLoadServer(input);
    })
    .client(async (): Promise<GiftCardReceiptPageProps> => {
        // Playwright loads this URL as a full document request (SSR). Direct
        // client navigations are not supported.
        throw notFound();
    });

export const Route = createFileRoute('/server/gift-cards/$giftCardId/receipt')({
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === 'string' ? search.token : '',
    }),
    loaderDeps: ({ search }) => ({ token: search.token }),
    loader: ({ params, deps }) => giftCardReceiptLoad({ giftCardId: params.giftCardId, token: deps.token }),
    head: () => ({
        meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    }),
    component() {
        const { giftCard, invoiceAddress } = Route.useLoaderData();
        return <GiftCardReceiptPage giftCard={giftCard} invoiceAddress={invoiceAddress} />;
    },
});
