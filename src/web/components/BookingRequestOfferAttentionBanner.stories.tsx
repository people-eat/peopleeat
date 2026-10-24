import type { Meta, StoryObj } from '@storybook/react-vite';

import { fixtureBookingRequestId, fixtureOfferId } from '../storybook/fixtures/booking';
import { BookingRequestOfferAttentionBanner } from './BookingRequestOfferAttentionBanner';

const meta = {
    title: 'Booking/Attention Banner',
    component: BookingRequestOfferAttentionBanner,
    tags: ['autodocs'],
} satisfies Meta<typeof BookingRequestOfferAttentionBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithActionLink: Story = {
    args: {
        message: 'Ein Kennenlerngespräch wartet auf deine Bestätigung.',
        actionLabel: 'Zum Gespräch',
        actionLink: {
            to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
            params: {
                bookingRequestId: fixtureBookingRequestId,
                bookingRequestOfferId: fixtureOfferId,
            },
            search: { tab: 'call' },
        },
    },
};

export const WithoutActionLink: Story = {
    args: {
        message: 'Bitte bestätige die Menüänderungen, damit der Kunde fortfahren kann.',
        actionLabel: 'Änderungen prüfen',
    },
};
