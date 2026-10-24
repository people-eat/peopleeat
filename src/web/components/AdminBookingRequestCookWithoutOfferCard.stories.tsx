import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureBookingRequestId, fixtureCookWithoutOffer } from '../storybook/fixtures/booking';
import { AdminBookingRequestCookWithoutOfferCard } from './AdminBookingRequestCookWithoutOfferCard';

const meta = {
    title: 'Booking/Admin Cook Without Offer',
    component: AdminBookingRequestCookWithoutOfferCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof AdminBookingRequestCookWithoutOfferCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const sharedArgs = {
    bookingRequestId: fixtureBookingRequestId,
    isPublicationApproved: true,
    hasAcceptedOffer: false,
    notifyBusy: false,
    onNotify: () => {},
};

export const NotNotified: Story = {
    args: {
        ...sharedArgs,
        cookInTravelRadius: fixtureCookWithoutOffer,
    },
};

export const Notified: Story = {
    args: {
        ...sharedArgs,
        cookInTravelRadius: {
            ...fixtureCookWithoutOffer,
            notifiedAt: '2026-09-22T08:00:00.000Z',
        },
    },
};
