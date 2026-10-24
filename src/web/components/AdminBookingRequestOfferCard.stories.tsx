import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureAdminOffer, fixtureBookingRequestId } from '../storybook/fixtures/booking';
import { AdminBookingRequestOfferCard } from './AdminBookingRequestOfferCard';

const meta = {
    title: 'Booking/Admin Offer Card',
    component: AdminBookingRequestOfferCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof AdminBookingRequestOfferCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        bookingRequestId: fixtureBookingRequestId,
        offer: fixtureAdminOffer,
    },
};
