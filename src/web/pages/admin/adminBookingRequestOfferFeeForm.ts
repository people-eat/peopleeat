import { t } from '../../../i18n/t';
import {
    BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK,
    BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER,
    eurosToCents,
} from '../../../shared';
import type { Locale } from '../../utils/locale';

export type AdminOfferAcceptTriad = 'PENDING' | 'YES' | 'NO';

export function acceptTriadFromBool(value: boolean | null | undefined): AdminOfferAcceptTriad {
    if (value === true) return 'YES';
    if (value === false) return 'NO';
    return 'PENDING';
}

export function acceptTriadToBool(value: AdminOfferAcceptTriad): boolean | null {
    if (value === 'YES') return true;
    if (value === 'NO') return false;
    return null;
}

export const ADMIN_OFFER_ACCEPT_OPTIONS: readonly AdminOfferAcceptTriad[] = ['PENDING', 'YES', 'NO'];

export function adminOfferAcceptOptionLabel(value: AdminOfferAcceptTriad, locale: Locale): string {
    return t(locale, 'admin', `offerAccept.${value}`);
}

export type AdminOfferPriceInputFormValues = {
    travelExpensesEuros: string;
    travelDistanceKm: string;
    platformFeePercentCook: string;
    platformFeePercentCustomer: string;
};

export function defaultAdminOfferFeePercentFormValues(input?: {
    platformFeePercentCook?: number;
    platformFeePercentCustomer?: number;
}): Pick<AdminOfferPriceInputFormValues, 'platformFeePercentCook' | 'platformFeePercentCustomer'> {
    return {
        platformFeePercentCook: String(input?.platformFeePercentCook ?? BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK),
        platformFeePercentCustomer: String(input?.platformFeePercentCustomer ?? BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_CUSTOMER),
    };
}

function parsePlatformFeePercent(raw: string, fieldLabel: string, locale: Locale): number | { error: string } {
    const trimmed = raw.trim().replace(',', '.');
    if (trimmed.length === 0) {
        return { error: t(locale, 'admin', 'offerFee.fieldRequired', { field: fieldLabel }) };
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        return { error: t(locale, 'admin', 'offerFee.fieldInteger0To100', { field: fieldLabel }) };
    }
    return parsed;
}

export function parseAdminOfferPriceInputs(
    values: AdminOfferPriceInputFormValues & { menuPriceCents: number },
    locale: Locale,
):
    | {
          menuPriceCents: number;
          travelExpensesCents: number;
          travelDistanceKm: number | null;
          platformFeePercentCook: number;
          platformFeePercentCustomer: number;
      }
    | { error: string } {
    const travelExpensesCents = eurosToCents(values.travelExpensesEuros);
    if (values.menuPriceCents <= 0) {
        return { error: t(locale, 'admin', 'offerFee.menuPriceMustBePositive') };
    }
    if (travelExpensesCents == null || travelExpensesCents < 0) {
        return { error: t(locale, 'admin', 'offerFee.travelExpensesInvalid') };
    }

    const distanceRaw = values.travelDistanceKm.trim().replace(',', '.');
    let travelDistanceKm: number | null = null;
    if (distanceRaw.length > 0) {
        const parsed = Number.parseFloat(distanceRaw);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return { error: t(locale, 'admin', 'offerFee.travelDistanceInvalid') };
        }
        travelDistanceKm = parsed;
    }

    const cookLabel = t(locale, 'admin', 'offerFee.platformFeeCook');
    const platformFeePercentCook = parsePlatformFeePercent(values.platformFeePercentCook, cookLabel, locale);
    if (typeof platformFeePercentCook === 'object') {
        return platformFeePercentCook;
    }
    const customerLabel = t(locale, 'admin', 'offerFee.platformFeeCustomer');
    const platformFeePercentCustomer = parsePlatformFeePercent(values.platformFeePercentCustomer, customerLabel, locale);
    if (typeof platformFeePercentCustomer === 'object') {
        return platformFeePercentCustomer;
    }

    return {
        menuPriceCents: values.menuPriceCents,
        travelExpensesCents,
        travelDistanceKm,
        platformFeePercentCook,
        platformFeePercentCustomer,
    };
}
