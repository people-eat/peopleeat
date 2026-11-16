import { t } from '../../i18n/t';
import { DEFAULT_TIME_ZONE, formatCountryName, formatCurrency, formatDate } from '../../shared';
import type { Locale } from '../../shared/locale';
import { GIFT_CARD_RECEIPT_ISSUER_LINES } from '../../shared/siteBranding';
import type { GqlCInvoiceAddress } from '../graphql/generated';

// PDF capture surface for Playwright — not a GraphQL client page. Props are a
// narrow view model (not DB row types). `locale` is not on `GqlCGiftCard`, so
// the receipt fields are listed explicitly; invoice address matches the GraphQL
// `InvoiceAddress` shape. The redeem code stays on the voucher and the purchase
// email, not on this document.

export type GiftCardReceiptPageProps = {
    giftCard: {
        giftCardId: string;
        locale: Locale;
        originalBalanceCents: number;
        payedAt: Date;
    };
    invoiceAddress: GqlCInvoiceAddress;
};

export function GiftCardReceiptPage({ giftCard, invoiceAddress }: GiftCardReceiptPageProps) {
    const locale: Locale = giftCard.locale;
    const timeZone = DEFAULT_TIME_ZONE;
    const amount = formatCurrency(giftCard.originalBalanceCents, { locale });
    const purchasedAt = formatDate(giftCard.payedAt, { locale, timeZone, dateStyle: 'long' });
    const country = formatCountryName(invoiceAddress.country, { locale });

    return (
        <main id="main-content" data-receipt-ready className="relative mx-auto w-full max-w-[720px] bg-white px-10 py-12 text-neutral-900">
            <header className="grid gap-4 border-b border-neutral-200 pb-6">
                <div className="grid gap-2">
                    <p className="font-serif text-3xl tracking-tight">peopleeat</p>
                    <h1 className="text-lg font-medium">{t(locale, 'public', 'giftCard.receipt.title')}</h1>
                </div>
                <address className="grid gap-0.5 text-sm/relaxed text-neutral-700 not-italic">
                    {GIFT_CARD_RECEIPT_ISSUER_LINES.map((line) => (
                        <span key={line}>{line}</span>
                    ))}
                </address>
            </header>

            <section className="grid gap-6 py-8">
                <dl className="grid gap-6">
                    <ReceiptRow label={t(locale, 'public', 'giftCard.receipt.date')} value={purchasedAt} />
                    <ReceiptRow label={t(locale, 'public', 'giftCard.receipt.amount')} value={amount} />
                    <ReceiptRow label={t(locale, 'public', 'giftCard.receipt.id')} value={giftCard.giftCardId} mono />
                </dl>
            </section>

            <section className="grid gap-3 border-t border-neutral-200 pt-8">
                <h2 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
                    {t(locale, 'public', 'giftCard.receipt.billingAddress')}
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
                    <span>{country}</span>
                </div>
            </section>

            <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
                {t(locale, 'public', 'giftCard.receipt.footer')}
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
