const AMOUNT_PRESETS_EUROS = [100, 150, 200, 300, 500] as const;
const DEFAULT_AMOUNT_EUROS = 200;
const MIN_AMOUNT_EUROS = 25;

const OCCASION_VALUES = ['Geburtstag', 'Geburt', 'Hochzeit', 'Jahrestag', 'Dankeschön', 'Weihnachten', 'Einfach so'] as const;

export type GiftCardFormStep = 'configure' | 'auth';

export type GiftCardFormSearch = {
    amount?: number;
    occasion?: string;
    recipient?: string;
    message?: string;
    step?: GiftCardFormStep;
};

export type GiftCardFormValues = {
    amountPreset: number | 'custom';
    customEuros: string;
    occasion: string;
    recipientName: string;
    message: string;
};

function parsePositiveNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value.replace(',', '.'));
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return undefined;
}

function isFormStep(value: unknown): value is GiftCardFormStep {
    return value === 'configure' || value === 'auth';
}

export function parseGiftCardFormSearch(search: Record<string, unknown>): GiftCardFormSearch {
    const amount = parsePositiveNumber(search.amount);
    const occasion =
        typeof search.occasion === 'string' && (OCCASION_VALUES as readonly string[]).includes(search.occasion)
            ? search.occasion
            : undefined;
    const recipient = typeof search.recipient === 'string' && search.recipient.trim().length > 0 ? search.recipient.trim() : undefined;
    const message = typeof search.message === 'string' && search.message.trim().length > 0 ? search.message : undefined;
    const step = isFormStep(search.step) ? search.step : undefined;

    return { amount, occasion, recipient, message, step };
}

export function giftCardFormBalanceCents(values: GiftCardFormValues): number {
    if (values.amountPreset === 'custom') {
        return eurosToCentsLocal(values.customEuros) ?? 0;
    }
    return values.amountPreset * 100;
}

function eurosToCentsLocal(eurosText: string): number | null {
    const normalized = eurosText.trim().replace(',', '.');
    if (normalized.length === 0) return null;
    const euros = Number(normalized);
    if (!Number.isFinite(euros) || euros <= 0) return null;
    return Math.round(euros * 100);
}

export function giftCardFormValuesFromSearch(search: GiftCardFormSearch): GiftCardFormValues {
    const amountEuros = search.amount != null && search.amount >= MIN_AMOUNT_EUROS ? search.amount : DEFAULT_AMOUNT_EUROS;
    const isPreset = (AMOUNT_PRESETS_EUROS as readonly number[]).includes(amountEuros);
    return {
        amountPreset: isPreset ? amountEuros : 'custom',
        customEuros: String(amountEuros),
        occasion: search.occasion ?? OCCASION_VALUES[0],
        recipientName: search.recipient ?? '',
        message: search.message ?? '',
    };
}

export function giftCardFormSearchFromValues(input: { values: GiftCardFormValues; step: GiftCardFormStep }): GiftCardFormSearch {
    const { values, step } = input;
    const amountEuros =
        values.amountPreset === 'custom'
            ? (eurosToCentsLocal(values.customEuros) ?? DEFAULT_AMOUNT_EUROS * 100) / 100
            : values.amountPreset;
    return {
        amount: amountEuros !== DEFAULT_AMOUNT_EUROS ? amountEuros : undefined,
        occasion: values.occasion !== OCCASION_VALUES[0] ? values.occasion : undefined,
        recipient: values.recipientName.trim() || undefined,
        message: values.message.trim() || undefined,
        step: step === 'configure' ? undefined : step,
    };
}

export function giftCardFormSearchEqual(a: GiftCardFormSearch, b: GiftCardFormSearch): boolean {
    return (
        a.amount === b.amount && a.occasion === b.occasion && a.recipient === b.recipient && a.message === b.message && a.step === b.step
    );
}

export { AMOUNT_PRESETS_EUROS, MIN_AMOUNT_EUROS };
