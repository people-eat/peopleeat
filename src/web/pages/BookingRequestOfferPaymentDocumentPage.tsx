import { t } from '../../i18n/t';
import {
    DEFAULT_TIME_ZONE,
    formatBookingEventWhenFromCountry,
    formatBookingWhenJoined,
    formatCountryName,
    formatCurrency,
    formatDate,
} from '../../shared';
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
    venueCountry?: string | null;
    venueCity?: string | null;
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

function copy(locale: Locale, key: string): string {
    return t(locale, 'publicBooking', `paymentDocument.${key}`);
}

export function BookingRequestOfferPaymentDocumentPage(props: BookingRequestOfferPaymentDocumentPageProps) {
    const locale = props.locale;
    const timeZone = props.timeZone || DEFAULT_TIME_ZONE;
    const paidAt = formatDate(props.paidAt, { locale, timeZone, dateStyle: 'long' });
    const eventAt = formatBookingWhenJoined(
        formatBookingEventWhenFromCountry({
            instant: props.eventAt,
            locale,
            viewerTimeZone: timeZone,
            venueCountry: props.venueCountry,
            venueCity: props.venueCity,
        }),
    );
    const title = props.kind === 'customer-receipt' ? copy(locale, 'receiptTitle') : copy(locale, 'statementTitle');
    const lines = props.kind === 'customer-receipt' ? customerLines(props, locale) : cookLines(props, locale);
    const totalLabel = props.kind === 'customer-receipt' ? copy(locale, 'amountPaid') : copy(locale, 'payout');
    const totalCents = props.kind === 'customer-receipt' ? props.totalCentsCustomer : props.payoutCentsCook;
    const footer = props.kind === 'customer-receipt' ? copy(locale, 'receiptFooter') : copy(locale, 'statementFooter');

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
                    <DocumentRow label={copy(locale, 'date')} value={paidAt} />
                    <DocumentRow label={copy(locale, 'occasion')} value={props.occasion} />
                    <DocumentRow label={copy(locale, 'event')} value={eventAt} />
                    <DocumentRow
                        label={props.kind === 'customer-receipt' ? copy(locale, 'cook') : copy(locale, 'guest')}
                        value={props.kind === 'customer-receipt' ? props.cookName : props.guestName}
                    />
                    <DocumentRow label={copy(locale, 'bookingNumber')} value={props.bookingRequestId} mono />
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
                        {props.kind === 'customer-receipt' ? copy(locale, 'billingAddress') : copy(locale, 'guestBillingAddress')}
                    </h2>
                    <AddressBlock locale={locale} address={props.invoiceAddress} />
                </section>
            ) : null}

            <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">{footer}</footer>
        </main>
    );
}

function customerLines(props: BookingRequestOfferCustomerReceiptPageProps, locale: Locale): { label: string; amountCents: number }[] {
    const lines: { label: string; amountCents: number }[] = [{ label: copy(locale, 'menu'), amountCents: props.menuPriceCents }];
    if (props.travelExpensesCents > 0) {
        lines.push({ label: copy(locale, 'travel'), amountCents: props.travelExpensesCents });
    }
    if (props.platformFeeCentsCustomer > 0) {
        lines.push({ label: copy(locale, 'serviceFee'), amountCents: props.platformFeeCentsCustomer });
    }
    if (props.paymentProviderFeeCents > 0) {
        lines.push({ label: copy(locale, 'paymentProcessing'), amountCents: props.paymentProviderFeeCents });
    }
    if (props.giftCardAppliedCents > 0) {
        lines.push({ label: copy(locale, 'giftCard'), amountCents: -props.giftCardAppliedCents });
    }
    if (props.promoDiscountCents > 0) {
        lines.push({ label: copy(locale, 'promoCode'), amountCents: -props.promoDiscountCents });
    }
    return lines;
}

function cookLines(props: BookingRequestOfferCookStatementPageProps, locale: Locale): { label: string; amountCents: number }[] {
    const lines: { label: string; amountCents: number }[] = [{ label: copy(locale, 'menu'), amountCents: props.menuPriceCents }];
    if (props.travelExpensesCents > 0) {
        lines.push({ label: copy(locale, 'travel'), amountCents: props.travelExpensesCents });
    }
    lines.push({
        label: copy(locale, 'invoiceGuest'),
        amountCents: props.menuPriceCents + props.travelExpensesCents,
    });
    if (props.platformFeeCentsCook > 0) {
        lines.push({ label: copy(locale, 'peopleeatFee'), amountCents: -props.platformFeeCentsCook });
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
