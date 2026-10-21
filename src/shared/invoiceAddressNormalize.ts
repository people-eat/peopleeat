import { textNormalizeSingleLine, textNormalizeTitled } from './textNormalize';

export type InvoiceAddressInput = {
    companyName?: string | null;
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    postalCode: string;
    line1: string;
    line2?: string | null;
};

export type InvoiceAddressNormalized = {
    companyName: string | null;
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    postalCode: string;
    line1: string;
    line2: string;
};

/** Normalize invoice name / address fields for Stripe and persisted JSON. */
export function invoiceAddressNormalize(input: InvoiceAddressInput): InvoiceAddressNormalized {
    const companyNameRaw = input.companyName == null ? '' : textNormalizeTitled(input.companyName);
    return {
        companyName: companyNameRaw.length === 0 ? null : companyNameRaw,
        firstName: textNormalizeTitled(input.firstName),
        lastName: textNormalizeTitled(input.lastName),
        country: textNormalizeSingleLine(input.country).toUpperCase(),
        city: textNormalizeTitled(input.city),
        postalCode: textNormalizeSingleLine(input.postalCode),
        line1: textNormalizeSingleLine(input.line1),
        line2: textNormalizeSingleLine(input.line2 ?? ''),
    };
}
