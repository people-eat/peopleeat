export type GiftCardPaymentStatus = 'PREPARED' | 'PAYED';

export type GiftCardInvoiceAddress = {
    companyName?: string | null;
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    postalCode: string;
    line1: string;
    line2: string;
};
