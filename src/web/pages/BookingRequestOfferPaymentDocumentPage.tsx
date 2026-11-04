import { DEFAULT_TIME_ZONE, formatCountryName, formatCurrency, formatDate, formatTime } from '../../shared';
import type { Locale } from '../../shared/locale';
import { GIFT_CARD_RECEIPT_ISSUER_LINES } from '../../shared/siteBranding';
import { cn } from '../utils/cn';

// PDF capture surfaces for Playwright. Courtesy documents, not tax invoices.
// The cook still invoices the guest for menu and travel.

export type BookingRequestOfferPaymentDocumentAddress = {
    companyName: string | null;
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    postalCode: string;
    line1: string;
    line2: string;
};

type DocumentBase = {
    locale: Locale;
    timeZone: string;
    paidAt: Date;
    eventAt: Date;
    bookingRequestId: string;
    occasion: string;
    invoiceAddress: BookingRequestOfferPaymentDocumentAddress | null;
};

export type BookingRequestOfferCustomerReceiptPageProps = DocumentBase & {
    kind: 'customer-receipt';
    cookName: string;
    menuPriceCents: number;
    travelExpensesCents: number;
    platformFeeCentsCustomer: number;
    paymentProviderFeeCents: number;
    giftCardAppliedCents: number;
    promoDiscountCents: number;
    totalCentsCustomer: number;
};

export type BookingRequestOfferCookStatementPageProps = DocumentBase & {
    kind: 'cook-statement';
    guestName: string;
    menuPriceCents: number;
    travelExpensesCents: number;
    platformFeeCentsCook: number;
    payoutCentsCook: number;
};

export type BookingRequestOfferPaymentDocumentPageProps =
    BookingRequestOfferCustomerReceiptPageProps | BookingRequestOfferCookStatementPageProps;

export function BookingRequestOfferPaymentDocumentPage(props: BookingRequestOfferPaymentDocumentPageProps) {
    const locale = props.locale;
    const timeZone = props.timeZone || DEFAULT_TIME_ZONE;
    const paidAt = formatDate(props.paidAt, { locale, timeZone, dateStyle: 'long' });
    const eventAt = `${formatDate(props.eventAt, { locale, timeZone, weekday: true, dateStyle: 'long' })}, ${formatTime(props.eventAt, { locale, timeZone, timeStyle: 'short' })}`;
    const title =
        props.kind === 'customer-receipt'
            ? { de: 'Zahlungsbeleg', en: 'Payment receipt' }[locale]
            : { de: 'Abrechnung', en: 'Payout statement' }[locale];
    const lines = props.kind === 'customer-receipt' ? customerLines(props, locale) : cookLines(props, locale);
    const totalLabel =
        props.kind === 'customer-receipt'
            ? { de: 'Gezahlter Betrag', en: 'Amount paid' }[locale]
            : { de: 'Auszahlungsbetrag', en: 'Payout' }[locale];
    const totalCents = props.kind === 'customer-receipt' ? props.totalCentsCustomer : props.payoutCentsCook;
    const footer =
        props.kind === 'customer-receipt'
            ? {
                  de: 'Zahlungsbeleg für eine peopleeat-Buchung. Keine Rechnung. Die Bewirtung rechnet der Koch direkt mit dir ab.',
                  en: 'Payment receipt for a peopleeat booking. Not an invoice. The cook invoices you directly for the catering.',
              }[locale]
            : {
                  de: 'Abrechnung zur Dokumentation. Keine Rechnung. Bitte stelle deine Rechnung an den Gast über Menü und Fahrtkosten. Die peopleeat-Gebühr ist vom Auszahlungsbetrag einbehalten.',
                  en: 'Statement for your records. Not an invoice. Please invoice the guest for the menu and travel. The peopleeat fee is withheld from the payout.',
              }[locale];

    return (
        <main
            id="main-content"
            data-payment-document-ready
            className="relative mx-auto w-full max-w-[720px] bg-white px-10 py-12 text-neutral-900"
        >
            <header className="grid gap-4 border-b border-neutral-200 pb-6">
                <div className="grid gap-2">
                    <p className="font-serif text-3xl tracking-tight">peopleeat</p>
                    <h1 className="text-lg font-medium">{title}</h1>
                </div>
                <address className="grid gap-0.5 text-sm/relaxed text-neutral-700 not-italic">
                    {GIFT_CARD_RECEIPT_ISSUER_LINES.map((line) => (
                        <span key={line}>{line}</span>
                    ))}
                </address>
            </header>

            <section className="grid gap-5 py-6">
                <dl className="grid gap-2">
                    <DocumentRow label={{ de: 'Datum', en: 'Date' }[locale]} value={paidAt} />
                    <DocumentRow label={{ de: 'Anlass', en: 'Occasion' }[locale]} value={props.occasion} />
                    <DocumentRow label={{ de: 'Termin', en: 'Event' }[locale]} value={eventAt} />
                    <DocumentRow
                        label={props.kind === 'customer-receipt' ? { de: 'Koch', en: 'Cook' }[locale] : { de: 'Gast', en: 'Guest' }[locale]}
                        value={props.kind === 'customer-receipt' ? props.cookName : props.guestName}
                    />
                    <DocumentRow label={{ de: 'Buchungsnummer', en: 'Booking number' }[locale]} value={props.bookingRequestId} mono />
                </dl>
                <dl className="grid gap-2 border-t border-neutral-200 pt-4">
                    {lines.map((line) => (
                        <DocumentRow key={line.label} label={line.label} value={formatCurrency(line.amountCents, { locale })} />
                    ))}
                    <DocumentRow label={totalLabel} value={formatCurrency(totalCents, { locale })} emphasis />
                </dl>
            </section>

            {props.invoiceAddress ? (
                <section className="grid gap-3 border-t border-neutral-200 pt-8">
                    <h2 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
                        {
                            (props.kind === 'customer-receipt'
                                ? { de: 'Rechnungsadresse', en: 'Billing address' }
                                : { de: 'Rechnungsadresse des Gastes', en: 'Guest billing address' })[locale]
                        }
                    </h2>
                    <AddressBlock locale={locale} address={props.invoiceAddress} />
                </section>
            ) : null}

            <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">{footer}</footer>
        </main>
    );
}

function customerLines(props: BookingRequestOfferCustomerReceiptPageProps, locale: Locale): { label: string; amountCents: number }[] {
    const lines: { label: string; amountCents: number }[] = [
        { label: { de: 'Menü', en: 'Menu' }[locale], amountCents: props.menuPriceCents },
    ];
    if (props.travelExpensesCents > 0) {
        lines.push({ label: { de: 'Fahrtkosten', en: 'Travel' }[locale], amountCents: props.travelExpensesCents });
    }
    if (props.platformFeeCentsCustomer > 0) {
        lines.push({ label: { de: 'Servicegebühr', en: 'Service fee' }[locale], amountCents: props.platformFeeCentsCustomer });
    }
    if (props.paymentProviderFeeCents > 0) {
        lines.push({
            label: { de: 'Zahlungsabwicklung', en: 'Payment processing' }[locale],
            amountCents: props.paymentProviderFeeCents,
        });
    }
    if (props.giftCardAppliedCents > 0) {
        lines.push({ label: { de: 'Gutschein', en: 'Gift card' }[locale], amountCents: -props.giftCardAppliedCents });
    }
    if (props.promoDiscountCents > 0) {
        lines.push({ label: { de: 'Aktionscode', en: 'Promo code' }[locale], amountCents: -props.promoDiscountCents });
    }
    return lines;
}

function cookLines(props: BookingRequestOfferCookStatementPageProps, locale: Locale): { label: string; amountCents: number }[] {
    const lines: { label: string; amountCents: number }[] = [
        { label: { de: 'Menü', en: 'Menu' }[locale], amountCents: props.menuPriceCents },
    ];
    if (props.travelExpensesCents > 0) {
        lines.push({ label: { de: 'Fahrtkosten', en: 'Travel' }[locale], amountCents: props.travelExpensesCents });
    }
    lines.push({
        label: { de: 'Rechnungsbetrag an den Gast', en: 'Amount to invoice the guest' }[locale],
        amountCents: props.menuPriceCents + props.travelExpensesCents,
    });
    if (props.platformFeeCentsCook > 0) {
        lines.push({ label: { de: 'peopleeat-Gebühr', en: 'peopleeat fee' }[locale], amountCents: -props.platformFeeCentsCook });
    }
    return lines;
}

function AddressBlock({ locale, address }: { locale: Locale; address: BookingRequestOfferPaymentDocumentAddress }) {
    const country = formatCountryName(address.country, { locale });
    return (
        <div className="grid gap-0.5 text-sm/relaxed">
            {address.companyName ? <span>{address.companyName}</span> : null}
            <span>
                {address.firstName} {address.lastName}
            </span>
            {address.line1 ? <span>{address.line1}</span> : null}
            {address.line2 ? <span>{address.line2}</span> : null}
            {address.postalCode || address.city ? (
                <span>
                    {address.postalCode} {address.city}
                </span>
            ) : null}
            {country ? <span>{country}</span> : null}
        </div>
    );
}

function DocumentRow({ label, value, mono, emphasis }: { label: string; value: string; mono?: boolean; emphasis?: boolean }) {
    return (
        <div className={cn('grid gap-1 sm:grid-cols-[12rem_1fr] sm:items-baseline sm:gap-4', emphasis && 'mt-3')}>
            <dt
                className={cn('text-xs font-medium tracking-wide text-neutral-500 uppercase', emphasis && 'font-semibold text-neutral-900')}
            >
                {label}
            </dt>
            <dd className={cn(mono ? 'font-mono text-sm break-all' : 'text-sm', emphasis && 'text-base font-semibold')}>{value}</dd>
        </div>
    );
}
