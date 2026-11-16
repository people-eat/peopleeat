import { useEffect, useId, useState } from 'react';

import { t } from '../../i18n/t';
import { bookingRequestOfferPriceCalculate, bookingRequestPaidParticipants, formatCurrency } from '../../shared';
import type { Locale } from '../../shared';
import { cn } from '../utils/cn';
import { Input } from './base/input';
import { StatusAlert } from './base/status-alert';

type BookingRequestOfferPriceGuidanceFields = {
    suggestedOfferAmountCents: number;
    minOfferAmountCents: number | null;
    maxOfferAmountCents: number | null;
    minOfferAmountHardCents: number | null;
};

export type BookingRequestOfferPriceConfigurationPanelProps = {
    locale: Locale;
    viewer: 'cook' | 'admin';
    participantsAdult: number;
    participantsDiscounted: number;
    travelExpensesCents: number;
    guidance: BookingRequestOfferPriceGuidanceFields;
    /** Seed / reset key — when this changes, the per-person field re-seeds from guidance. */
    resetKey?: string;
    initialPricePerPersonCents?: number;
    /** Sticky offer fee % (defaults to marketplace 18 / 4 when omitted). */
    platformFeePercentCook?: number;
    platformFeePercentCustomer?: number;
    disabled?: boolean;
    onMenuPriceCentsChange: (menuPriceCents: number) => void;
    onValidChange: (isValid: boolean) => void;
};

type BookingRequestOfferCostOverviewStoredPrice = {
    platformFeeCentsCook: number;
    platformFeeCentsCustomer: number;
    paymentProviderFeeCents: number;
    payoutCentsCook: number;
    totalWithoutDiscountsCentsCustomer: number;
};

export type BookingRequestOfferCostOverviewPanelProps = {
    locale: Locale;
    viewer: 'cook' | 'admin';
    participantsAdult: number;
    participantsDiscounted: number;
    pricePerPersonCents: number;
    travelExpensesCents: number;
    menuPriceCents: number;
    /** Sticky offer fee % for live calc (defaults to marketplace 18 / 4 when omitted). */
    platformFeePercentCook?: number;
    platformFeePercentCustomer?: number;
    /** When set (admin offer detail), prefer stored offer fees over a live recalculation. */
    storedPrice?: BookingRequestOfferCostOverviewStoredPrice;
};

function roundCents(amount: number): number {
    return Math.round(amount);
}

export function BookingRequestOfferCostOverviewPanel({
    locale,
    viewer,
    participantsAdult,
    participantsDiscounted,
    pricePerPersonCents,
    travelExpensesCents,
    menuPriceCents,
    platformFeePercentCook,
    platformFeePercentCustomer,
    storedPrice,
}: BookingRequestOfferCostOverviewPanelProps) {
    const [expandedSection, setExpandedSection] = useState<'cook' | 'customer' | undefined>();
    const calculated =
        menuPriceCents > 0
            ? bookingRequestOfferPriceCalculate({
                  menuPriceCents,
                  travelExpensesCents,
                  ...(platformFeePercentCook != null ? { platformFeePercentCook } : {}),
                  ...(platformFeePercentCustomer != null ? { platformFeePercentCustomer } : {}),
              })
            : null;
    const priceCalculation =
        calculated == null
            ? null
            : storedPrice
              ? {
                    ...calculated,
                    platformFeeCentsCook: storedPrice.platformFeeCentsCook,
                    platformFeeCentsCustomer: storedPrice.platformFeeCentsCustomer,
                    paymentProviderFeeCents: storedPrice.paymentProviderFeeCents,
                    payoutCentsCook: storedPrice.payoutCentsCook,
                    totalWithoutDiscountsCentsCustomer: storedPrice.totalWithoutDiscountsCentsCustomer,
                    travelExpensesCents,
                }
              : calculated;
    if (priceCalculation == null) return null;

    const cookPayoutLabel = {
        cook: t(locale, 'common', 'priceConfig.youEarn'),
        admin: t(locale, 'common', 'priceConfig.cookEarns'),
    }[viewer];
    const customerTotalLabel = {
        cook: t(locale, 'common', 'priceConfig.hostPrice'),
        admin: t(locale, 'common', 'priceConfig.customerPrice'),
    }[viewer];

    return (
        <div className="grid gap-3">
            <button
                type="button"
                className={cn(
                    'grid gap-3 rounded-xl border border-border bg-card p-4 text-left',
                    'cursor-pointer transition-colors hover:bg-muted/40',
                )}
                onClick={() => setExpandedSection((current) => (current === 'cook' ? undefined : 'cook'))}
            >
                <div className="flex justify-between gap-4 text-base font-semibold">
                    <span>{cookPayoutLabel}</span>
                    <span>{formatCurrency(priceCalculation.payoutCentsCook, { locale })}</span>
                </div>
                {expandedSection === 'cook' ? (
                    <dl className="grid gap-2 text-sm text-muted-foreground">
                        <div className="flex justify-between gap-4">
                            <dt>
                                {t(locale, 'common', 'priceConfig.adultsLine', {
                                    count: participantsAdult,
                                    amount: formatCurrency(pricePerPersonCents, { locale }),
                                })}
                            </dt>
                            <dd>{formatCurrency(pricePerPersonCents * participantsAdult, { locale })}</dd>
                        </div>
                        {participantsDiscounted > 0 ? (
                            <div className="flex justify-between gap-4">
                                <dt>
                                    {t(locale, 'common', 'priceConfig.childrenLine', {
                                        count: participantsDiscounted,
                                        amount: formatCurrency(roundCents(pricePerPersonCents * 0.5), { locale }),
                                    })}
                                </dt>
                                <dd>
                                    {formatCurrency(roundCents(pricePerPersonCents * 0.5 * participantsDiscounted), {
                                        locale,
                                    })}
                                </dd>
                            </div>
                        ) : null}
                        <div className="flex justify-between gap-4">
                            <dt>{t(locale, 'common', 'priceConfig.travelExpenses')}</dt>
                            <dd>{formatCurrency(priceCalculation.travelExpensesCents, { locale })}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>{t(locale, 'common', 'costBreakdown.serviceFees')}</dt>
                            <dd>-{formatCurrency(priceCalculation.platformFeeCentsCook, { locale })}</dd>
                        </div>
                    </dl>
                ) : null}
            </button>

            <button
                type="button"
                className={cn(
                    'grid gap-3 rounded-xl border border-border bg-card p-4 text-left',
                    'cursor-pointer transition-colors hover:bg-muted/40',
                )}
                onClick={() => setExpandedSection((current) => (current === 'customer' ? undefined : 'customer'))}
            >
                <div className="flex justify-between gap-4 text-base font-semibold">
                    <span>{customerTotalLabel}</span>
                    <span>{formatCurrency(priceCalculation.totalWithoutDiscountsCentsCustomer, { locale })}</span>
                </div>
                {expandedSection === 'customer' ? (
                    <dl className="grid gap-2 text-sm text-muted-foreground">
                        <div className="flex justify-between gap-4">
                            <dt>
                                {t(locale, 'common', 'priceConfig.adultsLine', {
                                    count: participantsAdult,
                                    amount: formatCurrency(pricePerPersonCents, { locale }),
                                })}
                            </dt>
                            <dd>{formatCurrency(pricePerPersonCents * participantsAdult, { locale })}</dd>
                        </div>
                        {participantsDiscounted > 0 ? (
                            <div className="flex justify-between gap-4">
                                <dt>
                                    {t(locale, 'common', 'priceConfig.childrenLine', {
                                        count: participantsDiscounted,
                                        amount: formatCurrency(roundCents(pricePerPersonCents * 0.5), { locale }),
                                    })}
                                </dt>
                                <dd>
                                    {formatCurrency(roundCents(pricePerPersonCents * 0.5 * participantsDiscounted), {
                                        locale,
                                    })}
                                </dd>
                            </div>
                        ) : null}
                        <div className="flex justify-between gap-4">
                            <dt>{t(locale, 'common', 'priceConfig.travelExpenses')}</dt>
                            <dd>{formatCurrency(priceCalculation.travelExpensesCents, { locale })}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>{t(locale, 'common', 'costBreakdown.serviceFees')}</dt>
                            <dd>
                                {formatCurrency(priceCalculation.platformFeeCentsCustomer + priceCalculation.paymentProviderFeeCents, {
                                    locale,
                                })}
                            </dd>
                        </div>
                    </dl>
                ) : null}
            </button>
        </div>
    );
}

export function BookingRequestOfferPriceConfigurationPanel({
    locale,
    viewer,
    participantsAdult,
    participantsDiscounted,
    travelExpensesCents,
    guidance,
    resetKey,
    initialPricePerPersonCents,
    platformFeePercentCook,
    platformFeePercentCustomer,
    disabled = false,
    onMenuPriceCentsChange,
    onValidChange,
}: BookingRequestOfferPriceConfigurationPanelProps) {
    const pricePerPersonId = useId();
    const seedCents = initialPricePerPersonCents ?? guidance.suggestedOfferAmountCents;
    const [pricePerPersonString, setPricePerPersonString] = useState(() => String(seedCents / 100));

    const paidParticipants = bookingRequestPaidParticipants(participantsAdult, participantsDiscounted);
    const pricePerPersonCents = roundCents(Number.parseFloat(pricePerPersonString.replace(',', '.')) * 100);
    const pricePerPersonFinite = Number.isFinite(pricePerPersonCents) && pricePerPersonCents > 0;
    const menuPriceCents = pricePerPersonFinite && paidParticipants > 0 ? roundCents(pricePerPersonCents * paidParticipants) : 0;

    const feePercents = {
        ...(platformFeePercentCook != null ? { platformFeePercentCook } : {}),
        ...(platformFeePercentCustomer != null ? { platformFeePercentCustomer } : {}),
    };
    const priceCalculation =
        menuPriceCents > 0 ? bookingRequestOfferPriceCalculate({ menuPriceCents, travelExpensesCents, ...feePercents }) : null;

    const pricePerPersonTooHigh =
        guidance.maxOfferAmountCents != null && pricePerPersonFinite && pricePerPersonCents > guidance.maxOfferAmountCents;
    const pricePerPersonTooLow =
        guidance.minOfferAmountCents != null && pricePerPersonFinite && pricePerPersonCents < guidance.minOfferAmountCents;
    const isHardMinimumNotMet =
        guidance.minOfferAmountHardCents != null &&
        priceCalculation != null &&
        priceCalculation.totalWithoutDiscountsCentsCustomer < guidance.minOfferAmountHardCents;
    const isInSuggestedRange =
        pricePerPersonFinite &&
        !pricePerPersonTooHigh &&
        !pricePerPersonTooLow &&
        !isHardMinimumNotMet &&
        pricePerPersonString.trim() !== '';

    function syncParent(nextPricePerPersonString: string) {
        const nextPricePerPerson = roundCents(Number.parseFloat(nextPricePerPersonString.replace(',', '.')) * 100);
        const nextFinite = Number.isFinite(nextPricePerPerson) && nextPricePerPerson > 0;
        const nextMenuPrice = nextFinite && paidParticipants > 0 ? roundCents(nextPricePerPerson * paidParticipants) : 0;
        const nextCalc =
            nextMenuPrice > 0
                ? bookingRequestOfferPriceCalculate({ menuPriceCents: nextMenuPrice, travelExpensesCents, ...feePercents })
                : null;
        const nextHardFail =
            guidance.minOfferAmountHardCents != null &&
            nextCalc != null &&
            nextCalc.totalWithoutDiscountsCentsCustomer < guidance.minOfferAmountHardCents;

        onMenuPriceCentsChange(nextCalc?.menuPriceCents ?? 0);
        onValidChange(nextPricePerPersonString.trim() !== '' && nextFinite && nextMenuPrice > 0 && !nextHardFail);
    }

    useEffect(() => {
        const next = String((initialPricePerPersonCents ?? guidance.suggestedOfferAmountCents) / 100);
        setPricePerPersonString(next);

        const nextPricePerPerson = roundCents(Number.parseFloat(next.replace(',', '.')) * 100);
        const nextFinite = Number.isFinite(nextPricePerPerson) && nextPricePerPerson > 0;
        const nextMenuPrice = nextFinite && paidParticipants > 0 ? roundCents(nextPricePerPerson * paidParticipants) : 0;
        const nextCalc =
            nextMenuPrice > 0
                ? bookingRequestOfferPriceCalculate({ menuPriceCents: nextMenuPrice, travelExpensesCents, ...feePercents })
                : null;
        const nextHardFail =
            guidance.minOfferAmountHardCents != null &&
            nextCalc != null &&
            nextCalc.totalWithoutDiscountsCentsCustomer < guidance.minOfferAmountHardCents;

        onMenuPriceCentsChange(nextCalc?.menuPriceCents ?? 0);
        onValidChange(next.trim() !== '' && nextFinite && nextMenuPrice > 0 && !nextHardFail);
    }, [
        resetKey,
        guidance.suggestedOfferAmountCents,
        guidance.minOfferAmountHardCents,
        initialPricePerPersonCents,
        travelExpensesCents,
        paidParticipants,
        platformFeePercentCook,
        platformFeePercentCustomer,
        onMenuPriceCentsChange,
        onValidChange,
    ]);

    return (
        <div className="grid gap-4">
            {viewer === 'cook' ? (
                <StatusAlert tone="info" title={t(locale, 'common', 'priceConfig.youSetPrice')}>
                    {t(locale, 'common', 'priceConfig.suggestionHint')}
                </StatusAlert>
            ) : null}

            <div className="grid gap-2">
                <label htmlFor={pricePerPersonId} className="text-base font-medium text-foreground">
                    {t(locale, 'common', 'priceConfig.menuPricePerPerson')}
                </label>
                <Input
                    id={pricePerPersonId}
                    inputMode="decimal"
                    value={pricePerPersonString}
                    disabled={disabled}
                    placeholder={t(locale, 'common', 'priceConfig.suggestionPlaceholder')}
                    onChange={(event) => {
                        const next = event.target.value;
                        setPricePerPersonString(next);
                        syncParent(next);
                    }}
                />
            </div>

            {isInSuggestedRange ? <StatusAlert tone="success">{t(locale, 'common', 'priceConfig.withinRange')}</StatusAlert> : null}

            {pricePerPersonTooHigh ? (
                <StatusAlert tone="warning">
                    {t(locale, 'common', 'priceConfig.aboveRange', {
                        amount: formatCurrency(guidance.suggestedOfferAmountCents, { locale }),
                    })}
                </StatusAlert>
            ) : null}

            {isHardMinimumNotMet ? <StatusAlert tone="error">{t(locale, 'common', 'priceConfig.minPromo')}</StatusAlert> : null}

            {pricePerPersonTooLow && pricePerPersonString.trim() !== '' && !isHardMinimumNotMet ? (
                <StatusAlert tone="success">{t(locale, 'common', 'priceConfig.goodPrice')}</StatusAlert>
            ) : null}

            {viewer === 'cook' && priceCalculation ? (
                <BookingRequestOfferCostOverviewPanel
                    locale={locale}
                    viewer={viewer}
                    participantsAdult={participantsAdult}
                    participantsDiscounted={participantsDiscounted}
                    pricePerPersonCents={pricePerPersonCents}
                    travelExpensesCents={travelExpensesCents}
                    menuPriceCents={menuPriceCents}
                />
            ) : null}
        </div>
    );
}
