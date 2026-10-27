import type { Meta, StoryObj } from '@storybook/react-vite';

import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';
import { AdminBookingRequestListCard } from '../components/AdminBookingRequestListCard';
import { CookBookingRequestCard } from '../components/CookBookingRequestCard';
import { CustomerBookingRequestCard } from '../components/CustomerBookingRequestCard';
import { fixtureAdminRequest, fixtureCookRequest, fixtureCookRequestDeclined, fixtureCustomerRequest } from './fixtures/booking';
import { RoleColumn } from './gallery';

const meta = {
    title: 'Perspectives/Request Cards',
    decorators: [perspectivesCanvasDecorator],
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SideBySide: Story = {
    render: () => (
        <div className="grid gap-8 lg:grid-cols-3">
            <RoleColumn label="Customer" contentClassName="max-w-md">
                <CustomerBookingRequestCard request={fixtureCustomerRequest} />
            </RoleColumn>
            <RoleColumn label="Cook (open pool)" contentClassName="max-w-md">
                <CookBookingRequestCard request={fixtureCookRequest} variant="open" />
            </RoleColumn>
            <RoleColumn label="Admin" contentClassName="max-w-md">
                <AdminBookingRequestListCard request={fixtureAdminRequest} />
            </RoleColumn>
        </div>
    ),
};

export const CookDeclinedVsCustomer: Story = {
    render: () => (
        <div className="grid gap-8 md:grid-cols-2">
            <RoleColumn label="Cook (declined)" contentClassName="max-w-md">
                <CookBookingRequestCard request={fixtureCookRequestDeclined} variant="declined" />
            </RoleColumn>
            <RoleColumn label="Customer (still open)" contentClassName="max-w-md">
                <CustomerBookingRequestCard request={fixtureCustomerRequest} />
            </RoleColumn>
        </div>
    ),
};
