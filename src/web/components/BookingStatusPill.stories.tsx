import type { Meta, StoryObj } from '@storybook/react-vite';

import type { BookingRequestOfferStatus } from '../../shared/bookingRequestOfferStatus';
import { bookingRequestOfferStatusHue, bookingRequestOfferStatusLabel } from '../../shared/bookingRequestOfferStatus';
import type { BookingRequestStatus } from '../../shared/bookingRequestStatus';
import { bookingRequestStatusHue, bookingRequestStatusLabel } from '../../shared/bookingRequestStatus';
import { useLocale } from '../hooks/useLocale';
import { BookingStatusPill } from './BookingStatusPill';

const requestStatuses: BookingRequestStatus[] = [
    'WAITING_FOR_OFFERS',
    'OFFERS_WAITING_FOR_REVIEW',
    'DEPOSIT_PAYMENT_PENDING',
    'PAYMENT_PULL_PENDING',
    'EVENT_PENDING',
    'COMPLETED',
    'EXPIRED',
    'CANCELED',
];

const offerStatuses: BookingRequestOfferStatus[] = [
    'USER_NEEDS_TO_ACCEPT',
    'COOK_NEEDS_TO_ACCEPT',
    'USER_REQUESTED_MENU_CHANGES',
    'USER_DECLINED',
    'COOK_DECLINED',
    'USER_CHOOSE_DIFFERENT_OFFER',
    'USER_NEEDS_DEPOSIT_PAYMENT',
    'PAYMENT_PULL_PENDING',
    'EVENT_PENDING',
    'COMPLETED',
    'EXPIRED',
    'CANCELED',
];

const meta = {
    title: 'Booking/Status Pill',
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function StatusMatrix() {
    const locale = useLocale();

    return (
        <div className="flex max-w-3xl flex-col gap-8">
            <section className="grid gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Booking request</h3>
                <div className="flex flex-wrap gap-2">
                    {requestStatuses.map((status) => (
                        <BookingStatusPill key={status} hue={bookingRequestStatusHue(status)}>
                            {bookingRequestStatusLabel(status, locale, 'customer')}
                        </BookingStatusPill>
                    ))}
                </div>
            </section>
            <section className="grid gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Booking offer (customer)</h3>
                <div className="flex flex-wrap gap-2">
                    {offerStatuses.map((status) => (
                        <BookingStatusPill key={status} hue={bookingRequestOfferStatusHue(status)}>
                            {bookingRequestOfferStatusLabel(status, locale, 'customer')}
                        </BookingStatusPill>
                    ))}
                </div>
            </section>
            <section className="grid gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Booking offer (cook)</h3>
                <div className="flex flex-wrap gap-2">
                    {offerStatuses.map((status) => (
                        <BookingStatusPill key={`cook-${status}`} hue={bookingRequestOfferStatusHue(status)}>
                            {bookingRequestOfferStatusLabel(status, locale, 'cook')}
                        </BookingStatusPill>
                    ))}
                </div>
            </section>
        </div>
    );
}

export const Matrix: Story = {
    render: () => <StatusMatrix />,
};
