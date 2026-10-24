import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureBookingRequestId, fixtureCustomerOffer } from '../storybook/fixtures/booking';
import { callBookingsByStatus, callOverviewItems } from '../storybook/fixtures/calls';
import { CustomerBookingRequestOfferCard } from './CustomerBookingRequestOfferCard';

const meta = {
    title: 'Booking/Customer Offer Card',
    component: CustomerBookingRequestOfferCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof CustomerBookingRequestOfferCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
    bookingRequestId: fixtureBookingRequestId,
    interactive: false,
};

export const Open: Story = {
    args: {
        ...baseArgs,
        offer: {
            ...fixtureCustomerOffer,
            status: 'USER_NEEDS_TO_ACCEPT',
            userUnreadNotificationCount: 0,
            callBookings: [],
            testimonialMissing: false,
        },
    },
};

export const WithUnread: Story = {
    args: {
        ...baseArgs,
        offer: {
            ...fixtureCustomerOffer,
            status: 'USER_NEEDS_TO_ACCEPT',
            userUnreadNotificationCount: 2,
            testimonialMissing: false,
        },
    },
};

export const ReviewMissing: Story = {
    args: {
        ...baseArgs,
        offer: {
            ...fixtureCustomerOffer,
            status: 'COMPLETED',
            userUnreadNotificationCount: 0,
            callBookings: [],
            testimonialMissing: true,
        },
    },
};

export const CallHint: Story = {
    args: {
        ...baseArgs,
        offer: {
            ...fixtureCustomerOffer,
            status: 'USER_NEEDS_TO_ACCEPT',
            userUnreadNotificationCount: 0,
            testimonialMissing: false,
            callBookings: callOverviewItems(callBookingsByStatus.pendingFromCook),
        },
    },
};
