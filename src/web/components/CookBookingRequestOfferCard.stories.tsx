import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureCookOffer } from '../storybook/fixtures/booking';
import { CookBookingRequestOfferCard } from './CookBookingRequestOfferCard';

const meta = {
    title: 'Booking/Cook Offer Card',
    component: CookBookingRequestOfferCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof CookBookingRequestOfferCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
    args: {
        offer: {
            ...fixtureCookOffer,
            status: 'USER_NEEDS_TO_ACCEPT',
            cookAccepted: false,
            userAccepted: false,
        },
    },
};

export const MutuallyAcceptedPayout: Story = {
    args: {
        offer: {
            ...fixtureCookOffer,
            status: 'EVENT_PENDING',
            cookAccepted: true,
            userAccepted: true,
            cookUnreadNotificationCount: 0,
        },
    },
};
