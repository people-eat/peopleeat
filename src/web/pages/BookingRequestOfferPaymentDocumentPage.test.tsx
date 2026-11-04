import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BookingRequestOfferPaymentDocumentPage } from './BookingRequestOfferPaymentDocumentPage';

const paidAt = new Date('2026-06-01T16:00:00.000Z');
const eventAt = new Date('2026-06-20T17:00:00.000Z');

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

describe('BookingRequestOfferPaymentDocumentPage', () => {
    it('renders a German customer receipt that is not an invoice', () => {
        render(
            <BookingRequestOfferPaymentDocumentPage
                kind="customer-receipt"
                locale="de"
                timeZone="Europe/Berlin"
                paidAt={paidAt}
                eventAt={eventAt}
                bookingRequestId="br-receipt-1"
                occasion="Geburtstag"
                invoiceAddress={invoiceAddress}
                cookName="Marie"
                menuPriceCents={20_000}
                travelExpensesCents={2_500}
                platformFeeCentsCustomer={800}
                paymentProviderFeeCents={500}
                giftCardAppliedCents={1_000}
                promoDiscountCents={0}
                totalCentsCustomer={22_800}
            />,
        );

        expect(screen.getByRole('heading', { name: 'Zahlungsbeleg' })).toBeTruthy();
        expect(screen.getByText('Marie')).toBeTruthy();
        expect(screen.getByText('br-receipt-1')).toBeTruthy();
        expect(screen.getByText(/Keine Rechnung/)).toBeTruthy();
        expect(screen.getByText('Deutschland')).toBeTruthy();
        expect(screen.getByText(/200,00/)).toBeTruthy();
        expect(screen.getByText(/228,00/)).toBeTruthy();
    });

    it('renders an English cook statement that is not an invoice', () => {
        render(
            <BookingRequestOfferPaymentDocumentPage
                kind="cook-statement"
                locale="en"
                timeZone="Europe/Berlin"
                paidAt={paidAt}
                eventAt={eventAt}
                bookingRequestId="br-receipt-1"
                occasion="Birthday"
                invoiceAddress={invoiceAddress}
                guestName="Ada Lovelace"
                menuPriceCents={20_000}
                travelExpensesCents={2_500}
                platformFeeCentsCook={3_600}
                payoutCentsCook={18_900}
            />,
        );

        expect(screen.getByRole('heading', { name: 'Payout statement' })).toBeTruthy();
        expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
        expect(screen.getByText(/Not an invoice/)).toBeTruthy();
        expect(screen.getByText('Germany')).toBeTruthy();
        expect(screen.getByText(/189,00|189.00/)).toBeTruthy();
    });
});
