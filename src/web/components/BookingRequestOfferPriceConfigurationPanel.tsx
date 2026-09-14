import { useEffect, useId, useState } from 'react';

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
    storedPrice,
}: BookingRequestOfferCostOverviewPanelProps) {
    const [expandedSection, setExpandedSection] = useState<'cook' | 'customer' | undefined>();
    const calculated = menuPriceCents > 0 ? bookingRequestOfferPriceCalculate({ menuPriceCents, travelExpensesCents }) : null;
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
        cook: { de: 'Du erhältst', en: 'You earn' }[locale],
        admin: { de: 'Koch erhält', en: 'Cook earns' }[locale],
    }[viewer];
    const customerTotalLabel = {
        cook: { de: 'Preis des Gastgebers', en: "Host's price" }[locale],
        admin: { de: 'Kundenpreis', en: 'Customer price' }[locale],
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
                                {
                                    {
                                        de: `Erwachsene (${participantsAdult} × ${formatCurrency(pricePerPersonCents, { locale })})`,
                                        en: `Adults (${participantsAdult} × ${formatCurrency(pricePerPersonCents, { locale })})`,
                                    }[locale]
                                }
                            </dt>
                            <dd>{formatCurrency(pricePerPersonCents * participantsAdult, { locale })}</dd>
                        </div>
                        {participantsDiscounted > 0 ? (
                            <div className="flex justify-between gap-4">
                                <dt>
                                    {
                                        {
                                            de: `Kinder (${participantsDiscounted} × ${formatCurrency(roundCents(pricePerPersonCents * 0.5), { locale })})`,
                                            en: `Children (${participantsDiscounted} × ${formatCurrency(roundCents(pricePerPersonCents * 0.5), { locale })})`,
                                        }[locale]
                                    }
                                </dt>
                                <dd>
                                    {formatCurrency(roundCents(pricePerPersonCents * 0.5 * participantsDiscounted), {
                                        locale,
                                    })}
                                </dd>
                            </div>
                        ) : null}
                        <div className="flex justify-between gap-4">
                            <dt>{{ de: 'Reisekosten', en: 'Travel expenses' }[locale]}</dt>
                            <dd>{formatCurrency(priceCalculation.travelExpensesCents, { locale })}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>{{ de: 'Servicegebühren', en: 'Service fees' }[locale]}</dt>
                            <dd>−{formatCurrency(priceCalculation.platformFeeCentsCook, { locale })}</dd>
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
                                {
                                    {
                                        de: `Erwachsene (${participantsAdult} × ${formatCurrency(pricePerPersonCents, { locale })})`,
                                        en: `Adults (${participantsAdult} × ${formatCurrency(pricePerPersonCents, { locale })})`,
                                    }[locale]
                                }
                            </dt>
                            <dd>{formatCurrency(pricePerPersonCents * participantsAdult, { locale })}</dd>
                        </div>
                        {participantsDiscounted > 0 ? (
                            <div className="flex justify-between gap-4">
                                <dt>
                                    {
                                        {
                                            de: `Kinder (${participantsDiscounted} × ${formatCurrency(roundCents(pricePerPersonCents * 0.5), { locale })})`,
                                            en: `Children (${participantsDiscounted} × ${formatCurrency(roundCents(pricePerPersonCents * 0.5), { locale })})`,
                                        }[locale]
                                    }
                                </dt>
                                <dd>
                                    {formatCurrency(roundCents(pricePerPersonCents * 0.5 * participantsDiscounted), {
                                        locale,
                                    })}
                                </dd>
                            </div>
                        ) : null}
                        <div className="flex justify-between gap-4">
                            <dt>{{ de: 'Reisekosten', en: 'Travel expenses' }[locale]}</dt>
                            <dd>{formatCurrency(priceCalculation.travelExpensesCents, { locale })}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt>{{ de: 'Servicegebühren', en: 'Service fees' }[locale]}</dt>
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

    const priceCalculation = menuPriceCents > 0 ? bookingRequestOfferPriceCalculate({ menuPriceCents, travelExpensesCents }) : null;

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
            nextMenuPrice > 0 ? bookingRequestOfferPriceCalculate({ menuPriceCents: nextMenuPrice, travelExpensesCents }) : null;
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
            nextMenuPrice > 0 ? bookingRequestOfferPriceCalculate({ menuPriceCents: nextMenuPrice, travelExpensesCents }) : null;
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
        onMenuPriceCentsChange,
        onValidChange,
    ]);

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <label htmlFor={pricePerPersonId} className="text-base font-medium text-foreground">
                    {
                        {
                            de: 'Menüpreis pro Person vorschlagen',
                            en: 'Suggest your menu price per person',
                        }[locale]
                    }
                </label>
                <Input
                    id={pricePerPersonId}
                    inputMode="decimal"
                    value={pricePerPersonString}
                    disabled={disabled}
                    placeholder={
                        {
                            de: 'Dein Menüpreisvorschlag pro Person',
                            en: 'Your menu price suggestion per person',
                        }[locale]
                    }
                    onChange={(event) => {
                        const next = event.target.value;
                        setPricePerPersonString(next);
                        syncParent(next);
                    }}
                />
            </div>

            {isInSuggestedRange ? (
                <StatusAlert tone="success">
                    {
                        {
                            de: 'Dieser Preis pro Person liegt in dem von uns vorgeschlagenen Rahmen.',
                            en: 'This price per person is within the range we have suggested.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {pricePerPersonTooHigh ? (
                <StatusAlert tone="error">
                    {
                        {
                            de: `Dieser Preis pro Person liegt über dem von uns vorgeschlagenen Rahmen. Unser Vorschlag ist ${formatCurrency(guidance.suggestedOfferAmountCents, { locale })} pro Person.`,
                            en: `This price per person is above the range we have suggested. Our suggestion is ${formatCurrency(guidance.suggestedOfferAmountCents, { locale })} per person.`,
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {isHardMinimumNotMet ? (
                <StatusAlert tone="error">
                    {
                        {
                            de: 'Der Preisvorschlag muss höher sein, da der Kunde einen Promocode mit Mindestpreis Regelung hinterlegt hat.',
                            en: 'The price proposal must be higher because the customer has entered a promo code with a minimum price clause.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {pricePerPersonTooLow && pricePerPersonString.trim() !== '' && !isHardMinimumNotMet ? (
                <StatusAlert tone="success">
                    {
                        {
                            de: 'Das ist ein guter Preis, der Kunde wird wahrscheinlich buchen.',
                            en: 'This is a good price, the customer will be likely to book.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {priceCalculation ? (
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
