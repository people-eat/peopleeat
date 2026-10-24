import type { ReactNode } from 'react';

import {
    BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK,
    BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER,
    bookingRequestOfferPriceCalculate,
    formatCurrency,
} from '../../../shared';
import { cn } from '../../utils/cn';
import type { Locale } from '../../utils/locale';

function parseLivePercent(raw: string): number | null {
    const trimmed = raw.trim().replace(',', '.');
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) return null;
    return parsed;
}

function money(cents: number, locale: Locale): string {
    return formatCurrency(cents, { locale });
}

function Delta({ before, after, locale }: { before: number; after: number; locale: Locale }) {
    const delta = after - before;
    if (delta === 0) return null;
    const sign = delta > 0 ? '+' : '-';
    return (
        <span className={cn('text-xs tabular-nums', delta > 0 ? 'text-emerald-700' : 'text-amber-800')}>
            {sign}
            {money(Math.abs(delta), locale)}
        </span>
    );
}

export function AdminBookingRequestOfferFeePreview({
    locale,
    menuPriceCents,
    travelExpensesCents,
    platformFeePercentCookRaw,
    platformFeePercentCustomerRaw,
    baseline,
    discountCents = 0,
}: {
    locale: Locale;
    menuPriceCents: number;
    travelExpensesCents: number;
    platformFeePercentCookRaw: string;
    platformFeePercentCustomerRaw: string;
    baseline?: {
        platformFeePercentCook: number;
        platformFeePercentCustomer: number;
        platformFeeCentsCook: number;
        platformFeeCentsCustomer: number;
        paymentProviderFeeCents: number;
        payoutCentsCook: number;
        totalWithoutDiscountsCentsCustomer: number;
        totalCentsCustomer: number | null;
    };
    discountCents?: number;
}) {
    const platformFeePercentCook =
        parseLivePercent(platformFeePercentCookRaw) ??
        baseline?.platformFeePercentCook ??
        BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK;
    const platformFeePercentCustomer =
        parseLivePercent(platformFeePercentCustomerRaw) ??
        baseline?.platformFeePercentCustomer ??
        BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER;

    if (menuPriceCents <= 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {
                    { de: 'Gib einen Menüpreis ein, um die Gebührenvorschau zu sehen.', en: 'Enter a menu price to see the fee preview.' }[
                        locale
                    ]
                }
            </p>
        );
    }

    const preview = bookingRequestOfferPriceCalculate({
        menuPriceCents,
        travelExpensesCents,
        platformFeePercentCook,
        platformFeePercentCustomer,
    });
    const totalCentsCustomerAfter = Math.max(0, preview.totalWithoutDiscountsCentsCustomer - discountCents);
    const platformWinCents = preview.platformFeeCentsCook + preview.platformFeeCentsCustomer;
    const baselineTotal = baseline != null ? (baseline.totalCentsCustomer ?? baseline.totalWithoutDiscountsCentsCustomer) : null;

    return (
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid gap-0.5">
                <p className="text-sm font-medium text-foreground">{{ de: 'Live-Vorschau', en: 'Live preview' }[locale]}</p>
                <p className="text-xs text-muted-foreground">
                    {
                        {
                            de: `Standard: ${BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK} % Koch / ${BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER} % Kunde`,
                            en: `Default: ${BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK}% cook / ${BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER}% customer`,
                        }[locale]
                    }
                </p>
            </div>
            <dl className="grid gap-2 text-sm">
                <PreviewRow
                    label={
                        {
                            de: `Plattformgebühr Koch (${preview.platformFeePercentCook} %)`,
                            en: `Platform fee cook (${preview.platformFeePercentCook}%)`,
                        }[locale]
                    }
                    value={money(preview.platformFeeCentsCook, locale)}
                    delta={
                        baseline ? (
                            <Delta before={baseline.platformFeeCentsCook} after={preview.platformFeeCentsCook} locale={locale} />
                        ) : null
                    }
                />
                <PreviewRow
                    label={
                        {
                            de: `Plattformgebühr Kunde (${preview.platformFeePercentCustomer} %)`,
                            en: `Platform fee customer (${preview.platformFeePercentCustomer}%)`,
                        }[locale]
                    }
                    value={money(preview.platformFeeCentsCustomer, locale)}
                    delta={
                        baseline ? (
                            <Delta before={baseline.platformFeeCentsCustomer} after={preview.platformFeeCentsCustomer} locale={locale} />
                        ) : null
                    }
                />
                <PreviewRow
                    label={{ de: 'Zahlungsanbietergebühr', en: 'Payment provider fee' }[locale]}
                    value={money(preview.paymentProviderFeeCents, locale)}
                    delta={
                        baseline ? (
                            <Delta before={baseline.paymentProviderFeeCents} after={preview.paymentProviderFeeCents} locale={locale} />
                        ) : null
                    }
                />
                <PreviewRow
                    label={{ de: 'Koch-Auszahlung', en: 'Cook payout' }[locale]}
                    value={money(preview.payoutCentsCook, locale)}
                    delta={baseline ? <Delta before={baseline.payoutCentsCook} after={preview.payoutCentsCook} locale={locale} /> : null}
                />
                <PreviewRow
                    label={{ de: 'Kundentotal', en: 'Customer total' }[locale]}
                    value={money(totalCentsCustomerAfter, locale)}
                    delta={baselineTotal != null ? <Delta before={baselineTotal} after={totalCentsCustomerAfter} locale={locale} /> : null}
                />
                <PreviewRow
                    label={{ de: 'Plattformgewinn', en: 'Platform profit' }[locale]}
                    value={money(platformWinCents, locale)}
                    highlight
                    delta={
                        baseline ? (
                            <Delta
                                before={baseline.platformFeeCentsCook + baseline.platformFeeCentsCustomer}
                                after={platformWinCents}
                                locale={locale}
                            />
                        ) : null
                    }
                />
            </dl>
        </div>
    );
}

function PreviewRow({ label, value, delta, highlight }: { label: string; value: string; delta?: ReactNode; highlight?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className={cn('text-muted-foreground', highlight && 'font-medium text-foreground')}>{label}</dt>
            <dd className={cn('flex items-baseline gap-2 tabular-nums', highlight && 'font-medium text-emerald-800')}>
                {delta}
                <span>{value}</span>
            </dd>
        </div>
    );
}
