import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureCookRequest, fixtureCookRequestDeclined } from '../storybook/fixtures/booking';
import { CookBookingRequestCard } from './CookBookingRequestCard';

const meta = {
    title: 'Booking/Cook Request Card',
    component: CookBookingRequestCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof CookBookingRequestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
    args: {
        request: fixtureCookRequest,
        variant: 'open',
    },
};

export const Declined: Story = {
    args: {
        request: fixtureCookRequestDeclined,
        variant: 'declined',
    },
};
