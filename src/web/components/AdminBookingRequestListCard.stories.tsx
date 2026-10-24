import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureAdminRequest } from '../storybook/fixtures/booking';
import { AdminBookingRequestListCard } from './AdminBookingRequestListCard';

const meta = {
    title: 'Booking/Admin Request Card',
    component: AdminBookingRequestListCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof AdminBookingRequestListCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        request: fixtureAdminRequest,
    },
};
