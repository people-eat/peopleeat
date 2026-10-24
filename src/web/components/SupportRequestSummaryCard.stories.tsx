import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureSupportRequest } from '../storybook/fixtures/booking';
import { fixtureCustomer } from '../storybook/fixtures/people';
import { SupportRequestSummaryCard } from './SupportRequestSummaryCard';

const meta = {
    title: 'Support/Summary Card',
    component: SupportRequestSummaryCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof SupportRequestSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const supportRequestId = fixtureSupportRequest.supportRequestId;

export const CustomerOpen: Story = {
    args: {
        request: fixtureSupportRequest,
        to: '/{-$locale}/profile/support-requests/$supportRequestId',
        params: { supportRequestId },
    },
};

export const CustomerResolved: Story = {
    args: {
        request: { ...fixtureSupportRequest, status: 'RESOLVED', userUnreadNotificationCount: 0 },
        to: '/{-$locale}/profile/support-requests/$supportRequestId',
        params: { supportRequestId },
    },
};

export const AdminOpen: Story = {
    args: {
        request: fixtureSupportRequest,
        unreadCount: fixtureSupportRequest.adminUnreadNotificationCount,
        customerName: fixtureCustomer.display,
        customerProfilePictureUrl: fixtureCustomer.profilePictureUrl,
        to: '/{-$locale}/admin/support-requests/$supportRequestId',
        params: { supportRequestId },
    },
};

export const AdminResolved: Story = {
    args: {
        request: { ...fixtureSupportRequest, status: 'RESOLVED', adminUnreadNotificationCount: 0 },
        unreadCount: 0,
        customerName: fixtureCustomer.display,
        customerProfilePictureUrl: fixtureCustomer.profilePictureUrl,
        to: '/{-$locale}/admin/support-requests/$supportRequestId',
        params: { supportRequestId },
    },
};
