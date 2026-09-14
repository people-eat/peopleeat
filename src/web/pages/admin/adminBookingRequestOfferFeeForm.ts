import { eurosToCents } from '../../../shared';
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
};

export function parseAdminOfferPriceInputs(values: AdminOfferPriceInputFormValues & { menuPriceCents: number }):
    | {
          menuPriceCents: number;
          travelExpensesCents: number;
          travelDistanceKm: number | null;
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

    return {
        menuPriceCents: values.menuPriceCents,
        travelExpensesCents,
        travelDistanceKm,
    };
}
