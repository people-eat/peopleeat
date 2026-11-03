import { createFileRoute, notFound } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';

import type { GiftCardVoucherPageProps } from '../web/pages/GiftCardVoucherPage';
import { GiftCardVoucherPage } from '../web/pages/GiftCardVoucherPage';

const giftCardVoucherLoad: (input: { giftCardId: string; token: string }) => Promise<GiftCardVoucherPageProps> = createIsomorphicFn()
    .server(async (input: { giftCardId: string; token: string }): Promise<GiftCardVoucherPageProps> => {
        const { giftCardVoucherLoadServer } = await import('../server/utils/giftCardVoucherLoadServer');
        return giftCardVoucherLoadServer(input);
    })
    .client(async (): Promise<GiftCardVoucherPageProps> => {
        throw notFound();
    });

export const Route = createFileRoute('/server/gift-cards/$giftCardId/voucher')({
    // Hydration keeps the server payload. A client reload would hit the
    // `.client()` loader and replace the voucher with the app 404 before print.
    staleTime: Infinity,
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === 'string' ? search.token : '',
    }),
    loaderDeps: ({ search }) => ({ token: search.token }),
    loader: ({ params, deps }) => giftCardVoucherLoad({ giftCardId: params.giftCardId, token: deps.token }),
    head: () => ({
        meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    }),
    component() {
        const { giftCard } = Route.useLoaderData();
        return <GiftCardVoucherPage giftCard={giftCard} />;
    },
});
