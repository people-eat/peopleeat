import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_TIME_ZONE, formatDate } from '../../shared';
import { GIFT_CARD_RECEIPT_ISSUER_LINES } from '../../shared/siteBranding';
import { GiftCardReceiptPage } from './GiftCardReceiptPage';

const payedAt = new Date('2026-03-15T12:00:00.000Z');

const invoiceAddress = {
    companyName: null,
    firstName: 'Ada',
    lastName: 'Lovelace',
    country: 'DE',
    city: 'Berlin',
    postalCode: '10115',
    line1: 'Musterstraße 1',
    line2: '',
};

function renderReceipt(locale: 'de' | 'en') {
    return render(
        <GiftCardReceiptPage
            giftCard={{
                giftCardId: '0123456789abcdefghij',
                locale,
                originalBalanceCents: 2500,
                payedAt,
            }}
            invoiceAddress={invoiceAddress}
        />,
    );
}

describe('GiftCardReceiptPage', () => {
    it('renders a German purchase receipt without the redeem code', () => {
        renderReceipt('de');

        for (const line of GIFT_CARD_RECEIPT_ISSUER_LINES) {
            expect(screen.getByText(line)).toBeTruthy();
        }
        expect(screen.getByText('Deutschland')).toBeTruthy();
        expect(screen.getByText(formatDate(payedAt, { locale: 'de', timeZone: DEFAULT_TIME_ZONE, dateStyle: 'long' }))).toBeTruthy();
        expect(screen.getByText(/25,00/)).toBeTruthy();
        expect(screen.getByText('0123456789abcdefghij')).toBeTruthy();
        expect(screen.getByText(/Keine Rechnung/)).toBeTruthy();
        expect(screen.queryByText('Code')).toBeNull();
    });

    it('renders an English purchase receipt without the redeem code', () => {
        renderReceipt('en');

        expect(screen.getByText('Germany')).toBeTruthy();
        expect(screen.getByText(formatDate(payedAt, { locale: 'en', timeZone: DEFAULT_TIME_ZONE, dateStyle: 'long' }))).toBeTruthy();
        expect(screen.getByText(/Not an invoice/)).toBeTruthy();
        expect(screen.queryByText('Code')).toBeNull();
    });
});
