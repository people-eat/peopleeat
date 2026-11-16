import { t } from '../../i18n/t';
import { formatCurrency } from '../../shared';
import type { GqlCUserBookingRequestOfferPriceImpact, GqlCUserBookingRequestOfferTravelImpact } from '../graphql/generated';
import type { Locale } from '../utils/locale';
import { StatusAlert } from './base/status-alert';

function signedKmLabel(deltaKm: number, locale: Locale): string {
    const rounded = Math.round(deltaKm * 10) / 10;
    const abs = Math.abs(rounded).toFixed(1);
    if (rounded > 0) return `+${abs} km`;
    if (rounded < 0) return `-${abs} km`;
    return t(locale, 'common', 'impact.zeroKm');
}

function signedTravelExpenseLabel(deltaCents: number, locale: Locale): string {
    const abs = formatCurrency(Math.abs(deltaCents), { locale });
    if (deltaCents > 0) return `+${abs}`;
    if (deltaCents < 0) return `-${abs}`;
    return t(locale, 'common', 'impact.zeroEur');
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
        return <StatusAlert tone="info" title={t(locale, 'common', 'impact.calculatingTravel')} />;
    }

    const changed = impacts.filter(travelImpactMeaningful);
    if (changed.length === 0) {
        return (
            <StatusAlert tone="info" title={t(locale, 'common', 'impact.noTravelChange')}>
                {t(locale, 'common', impacts.length === 1 ? 'impact.travelSameOne' : 'impact.travelSameOther')}
            </StatusAlert>
        );
    }

    return (
        <StatusAlert
            tone="warning"
            title={t(
                locale,
                'common',
                emphasizeOnSave ? 'impact.travelOnSave' : changed.length === 1 ? 'impact.onOffer' : 'impact.onOffers',
            )}
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
                            {signedTravelExpenseLabel(expenseDelta, locale)} {t(locale, 'common', 'impact.travel')}
                            {hostDelta != null ? (
                                <>
                                    {' · '}
                                    {signedTravelExpenseLabel(hostDelta, locale)} {t(locale, 'common', 'impact.hostPrice')}
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
    return t(locale, 'common', 'impact.zeroEur');
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
        return <StatusAlert tone="info" title={t(locale, 'common', 'impact.calculatingPrice')} />;
    }

    const changed = impacts.filter(priceImpactMeaningful);
    if (changed.length === 0) {
        return (
            <StatusAlert tone="info" title={t(locale, 'common', 'impact.noPriceChange')}>
                {t(locale, 'common', impacts.length === 1 ? 'impact.menuSameOne' : 'impact.menuSameOther')}
            </StatusAlert>
        );
    }

    return (
        <StatusAlert
            tone="warning"
            title={t(locale, 'common', showCookPayout ? 'impact.priceOnSave' : changed.length === 1 ? 'impact.onOffer' : 'impact.onOffers')}
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
                            {showCookPayout ? t(locale, 'common', 'impact.customer') : t(locale, 'common', 'costBreakdown.totalPrice')}
                            {showCookPayout ? (
                                <>
                                    {' · '}
                                    {signedTotalLabel(cookDelta, locale)} {t(locale, 'common', 'impact.cookPayout')}
                                </>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </StatusAlert>
    );
}
