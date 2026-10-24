import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureBookingRequestId, fixtureCustomerRequest } from '../storybook/fixtures/booking';
import { CustomerBookingRequestCard } from './CustomerBookingRequestCard';

const meta = {
    title: 'Booking/Customer Request Card',
    component: CustomerBookingRequestCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof CustomerBookingRequestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        request: {
            ...fixtureCustomerRequest,
            status: 'OFFERS_WAITING_FOR_REVIEW',
        },
    },
};

export const WithAttention: Story = {
    args: {
        request: {
            ...fixtureCustomerRequest,
            status: 'DEPOSIT_PAYMENT_PENDING',
        },
        attention: {
            tone: 'warning',
            badgeLabel: 'Zahlung',
            actionLabel: 'Zahlungsmittel hinterlegen',
            destination: {
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout',
                params: {
                    bookingRequestId: fixtureBookingRequestId,
                    bookingRequestOfferId: fixtureCustomerRequest.offers[0]!.bookingRequestOfferId,
                },
            },
        },
    },
};
