import { DEFAULT_TIME_ZONE, formatCurrency, formatDate } from '../../shared';
import type { Locale } from '../../shared/locale';
import type { GqlCInvoiceAddress } from '../graphql/generated';

// PDF capture surface for Playwright — not a GraphQL client page. Props are a
// narrow view model (not DB row types). `locale` is not on `GqlCGiftCard`, so
// the receipt fields are listed explicitly; invoice address matches the GraphQL
// `InvoiceAddress` shape.

export type GiftCardReceiptPageProps = {
    giftCard: {
        giftCardId: string;
        locale: Locale;
        originalBalanceCents: number;
        redeemCode: string;
        createdAt: Date;
    };
    invoiceAddress: GqlCInvoiceAddress;
};

export function GiftCardReceiptPage({ giftCard, invoiceAddress }: GiftCardReceiptPageProps) {
    const locale: Locale = giftCard.locale;
    const timeZone = DEFAULT_TIME_ZONE;
    const amount = formatCurrency(giftCard.originalBalanceCents, { locale });
    const purchasedAt = formatDate(giftCard.createdAt, { locale, timeZone, dateStyle: 'long' });

    return (
        <main
            id="main-content"
            data-receipt-ready
            className="relative mx-auto min-h-screen w-full max-w-[720px] bg-white px-10 py-12 text-neutral-900"
        >
            <header className="grid gap-2 border-b border-neutral-200 pb-6">
                <p className="font-serif text-3xl tracking-tight">peopleeat</p>
                <h1 className="text-lg font-medium">{{ de: 'Kaufbeleg: Gutschein', en: 'Purchase receipt: Gift card' }[locale]}</h1>
            </header>

            <section className="grid gap-6 py-8">
                <dl className="grid gap-6">
                    <ReceiptRow label={{ de: 'Datum', en: 'Date' }[locale]} value={purchasedAt} />
                    <ReceiptRow label={{ de: 'Betrag', en: 'Amount' }[locale]} value={amount} />
                    <ReceiptRow label={{ de: 'Gutschein-ID', en: 'Gift card ID' }[locale]} value={giftCard.giftCardId} mono />
                    <ReceiptRow label={{ de: 'Code', en: 'Code' }[locale]} value={giftCard.redeemCode} mono />
                </dl>
            </section>

            <section className="grid gap-3 border-t border-neutral-200 pt-8">
                <h2 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
                    {{ de: 'Rechnungsadresse', en: 'Billing address' }[locale]}
                </h2>
                <div className="grid gap-0.5 text-sm/relaxed">
                    {invoiceAddress.companyName ? <span>{invoiceAddress.companyName}</span> : null}
                    <span>
                        {invoiceAddress.firstName} {invoiceAddress.lastName}
                    </span>
                    <span>{invoiceAddress.line1}</span>
                    {invoiceAddress.line2 ? <span>{invoiceAddress.line2}</span> : null}
                    <span>
                        {invoiceAddress.postalCode} {invoiceAddress.city}
                    </span>
                    <span>{invoiceAddress.country}</span>
                </div>
            </section>

            <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
                {
                    {
                        de: 'Dies ist ein Kaufbeleg für Ihren peopleeat-Gutschein. Der Code zum Einlösen ist auch in der Kauf-E-Mail enthalten.',
                        en: 'This is a purchase receipt for your peopleeat gift card. The redeem code is also included in the purchase email.',
                    }[locale]
                }
            </footer>
        </main>
    );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-4">
            <dt className="text-xs font-medium tracking-wide text-neutral-500 uppercase">{label}</dt>
            <dd className={mono ? 'font-mono text-sm break-all' : 'text-sm'}>{value}</dd>
        </div>
    );
}
