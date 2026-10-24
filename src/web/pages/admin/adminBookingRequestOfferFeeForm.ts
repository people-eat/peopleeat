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

export const ADMIN_OFFER_ACCEPT_OPTIONS: readonly { value: AdminOfferAcceptTriad; de: string; en: string }[] = [
    { value: 'PENDING', de: 'Ausstehend', en: 'Pending' },
    { value: 'YES', de: 'Ja', en: 'Yes' },
    { value: 'NO', de: 'Nein', en: 'No' },
];

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

function parsePlatformFeePercent(raw: string, fieldLabel: Record<Locale, string>): number | { error: Record<Locale, string> } {
    const trimmed = raw.trim().replace(',', '.');
    if (trimmed.length === 0) {
        return {
            error: {
                de: `${fieldLabel.de} fehlt.`,
                en: `${fieldLabel.en} is required.`,
            },
        };
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        return {
            error: {
                de: `${fieldLabel.de} muss eine ganze Zahl von 0 bis 100 sein.`,
                en: `${fieldLabel.en} must be an integer from 0 to 100.`,
            },
        };
    }
    return parsed;
}

export function parseAdminOfferPriceInputs(values: AdminOfferPriceInputFormValues & { menuPriceCents: number }):
    | {
          menuPriceCents: number;
          travelExpensesCents: number;
          travelDistanceKm: number | null;
          platformFeePercentCook: number;
          platformFeePercentCustomer: number;
      }
    | { error: Record<Locale, string> } {
    const travelExpensesCents = eurosToCents(values.travelExpensesEuros);
    if (values.menuPriceCents <= 0) {
        return {
            error: {
                de: 'Menüpreis muss größer als 0 sein.',
                en: 'Menu price must be greater than 0.',
            },
        };
    }
    if (travelExpensesCents == null || travelExpensesCents < 0) {
        return {
            error: {
                de: 'Reisekosten ungültig.',
                en: 'Travel expenses are invalid.',
            },
        };
    }

    const distanceRaw = values.travelDistanceKm.trim().replace(',', '.');
    let travelDistanceKm: number | null = null;
    if (distanceRaw.length > 0) {
        const parsed = Number.parseFloat(distanceRaw);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return {
                error: {
                    de: 'Reiseentfernung ungültig.',
                    en: 'Travel distance is invalid.',
                },
            };
        }
        travelDistanceKm = parsed;
    }

    const platformFeePercentCook = parsePlatformFeePercent(values.platformFeePercentCook, {
        de: 'Plattformgebühr Koch (%)',
        en: 'Platform fee cook (%)',
    });
    if (typeof platformFeePercentCook === 'object') {
        return platformFeePercentCook;
    }
    const platformFeePercentCustomer = parsePlatformFeePercent(values.platformFeePercentCustomer, {
        de: 'Plattformgebühr Kunde (%)',
        en: 'Platform fee customer (%)',
    });
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
