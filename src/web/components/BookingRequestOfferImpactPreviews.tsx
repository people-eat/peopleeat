import { formatCurrency } from '../../shared';
import type { GqlCUserBookingRequestOfferPriceImpact, GqlCUserBookingRequestOfferTravelImpact } from '../graphql/generated';
import type { Locale } from '../utils/locale';
import { StatusAlert } from './base/status-alert';

function signedKmLabel(deltaKm: number, locale: Locale): string {
    const rounded = Math.round(deltaKm * 10) / 10;
    const abs = Math.abs(rounded).toFixed(1);
    if (rounded > 0) return `+${abs} km`;
    if (rounded < 0) return `-${abs} km`;
    return { de: '±0 km', en: '±0 km' }[locale];
}

function signedTravelExpenseLabel(deltaCents: number, locale: Locale): string {
    const abs = formatCurrency(Math.abs(deltaCents), { locale });
    if (deltaCents > 0) return `+${abs}`;
    if (deltaCents < 0) return `-${abs}`;
    return { de: '±0 €', en: '±€0' }[locale];
}

function travelImpactMeaningful(impact: GqlCUserBookingRequestOfferTravelImpact): boolean {
    const distanceDelta = impact.travelDistanceKmAfter - impact.travelDistanceKmBefore;
    const expenseDelta = impact.travelExpensesCentsAfter - impact.travelExpensesCentsBefore;
    const hostDelta =
        impact.totalCentsCustomerBefore != null && impact.totalCentsCustomerAfter != null
            ? impact.totalCentsCustomerAfter - impact.totalCentsCustomerBefore
            : 0;
    return Math.abs(distanceDelta) >= 0.05 || expenseDelta !== 0 || hostDelta !== 0;
}

export function BookingRequestOfferTravelImpactPreview({
    impacts,
    fetching,
    locale,
    /** Admin edit: title stresses that travel fees update on save. */
    emphasizeOnSave = false,
}: {
    impacts: GqlCUserBookingRequestOfferTravelImpact[];
    fetching: boolean;
    locale: Locale;
    emphasizeOnSave?: boolean;
}) {
    if (fetching) {
        return <StatusAlert tone="info" title={{ de: 'Fahrtkosten werden berechnet…', en: 'Calculating travel costs…' }[locale]} />;
    }

    const changed = impacts.filter(travelImpactMeaningful);
    if (changed.length === 0) {
        return (
            <StatusAlert tone="info" title={{ de: 'Keine Änderung der Fahrtkosten', en: 'No change to travel costs' }[locale]}>
                {
                    {
                        de: 'Für die bestehenden Angebote bleibt die Fahrtstrecke gleich.',
                        en: 'Travel distance stays the same for existing offers.',
                    }[locale]
                }
            </StatusAlert>
        );
    }

    return (
        <StatusAlert
            tone="warning"
            title={
                {
                    de: emphasizeOnSave ? 'Fahrtkosten-Wirkung beim Speichern' : 'Auswirkung auf Angebote',
                    en: emphasizeOnSave ? 'Travel impact on save' : 'Impact on offers',
                }[locale]
            }
        >
            <ul className="mt-2 grid gap-1.5 text-sm">
                {changed.map((impact) => {
                    const distanceDelta = impact.travelDistanceKmAfter - impact.travelDistanceKmBefore;
                    const expenseDelta = impact.travelExpensesCentsAfter - impact.travelExpensesCentsBefore;
                    const hostBefore = impact.totalCentsCustomerBefore;
                    const hostAfter = impact.totalCentsCustomerAfter;
                    const hostDelta = hostBefore != null && hostAfter != null ? hostAfter - hostBefore : null;
                    return (
                        <li key={impact.bookingRequestOfferId}>
                            <span className="font-medium">{impact.cookDisplay}</span>
                            {': '}
                            {signedKmLabel(distanceDelta, locale)}
                            {' · '}
                            {signedTravelExpenseLabel(expenseDelta, locale)} {{ de: 'Fahrtkosten', en: 'travel' }[locale]}
                            {hostDelta != null ? (
                                <>
                                    {' · '}
                                    {signedTravelExpenseLabel(hostDelta, locale)} {{ de: 'Gastgeberpreis', en: 'host price' }[locale]}
                                </>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </StatusAlert>
    );
}

function priceImpactMeaningful(impact: GqlCUserBookingRequestOfferPriceImpact): boolean {
    return (
        impact.menuPriceCentsAfter !== impact.menuPriceCentsBefore ||
        impact.totalWithoutDiscountsCentsCustomerAfter !== impact.totalWithoutDiscountsCentsCustomerBefore ||
        impact.totalCentsCustomerAfter !== impact.totalCentsCustomerBefore ||
        impact.payoutCentsCookAfter !== impact.payoutCentsCookBefore
    );
}

function signedTotalLabel(deltaCents: number, locale: Locale): string {
    const abs = formatCurrency(Math.abs(deltaCents), { locale });
    if (deltaCents > 0) return `+${abs}`;
    if (deltaCents < 0) return `-${abs}`;
    return { de: '±0 €', en: '±€0' }[locale];
}

export function BookingRequestOfferPriceImpactPreview({
    impacts,
    fetching,
    locale,
    /** Admin edit: also show cook payout delta next to the customer total. */
    showCookPayout = false,
}: {
    impacts: GqlCUserBookingRequestOfferPriceImpact[];
    fetching: boolean;
    locale: Locale;
    showCookPayout?: boolean;
}) {
    if (fetching) {
        return <StatusAlert tone="info" title={{ de: 'Preiswirkung wird berechnet…', en: 'Calculating price impact…' }[locale]} />;
    }

    const changed = impacts.filter(priceImpactMeaningful);
    if (changed.length === 0) {
        return (
            <StatusAlert tone="info" title={{ de: 'Keine Preisänderung', en: 'No price change' }[locale]}>
                {
                    {
                        de: 'Für die bestehenden Angebote bleibt der Menüpreis gleich.',
                        en: 'Menu price stays the same for existing offers.',
                    }[locale]
                }
            </StatusAlert>
        );
    }

    return (
        <StatusAlert
            tone="warning"
            title={
                {
                    de: showCookPayout ? 'Preiswirkung beim Speichern' : 'Auswirkung auf Angebote',
                    en: showCookPayout ? 'Price impact on save' : 'Impact on offers',
                }[locale]
            }
        >
            <ul className="mt-2 grid gap-1.5 text-sm">
                {changed.map((impact) => {
                    const customerDelta = impact.totalCentsCustomerAfter - impact.totalCentsCustomerBefore;
                    const cookDelta = impact.payoutCentsCookAfter - impact.payoutCentsCookBefore;
                    return (
                        <li key={impact.bookingRequestOfferId}>
                            <span className="font-medium">{impact.cookDisplay}</span>
                            {': '}
                            {signedTotalLabel(customerDelta, locale)}{' '}
                            {
                                {
                                    de: showCookPayout ? 'Kunde' : 'Gesamtpreis',
                                    en: showCookPayout ? 'customer' : 'total',
                                }[locale]
                            }
                            {showCookPayout ? (
                                <>
                                    {' · '}
                                    {signedTotalLabel(cookDelta, locale)} {{ de: 'Koch-Auszahlung', en: 'cook payout' }[locale]}
                                </>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </StatusAlert>
    );
}
