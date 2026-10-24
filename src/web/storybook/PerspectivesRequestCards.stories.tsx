import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';
import { AdminBookingRequestListCard } from '../components/AdminBookingRequestListCard';
import { CookBookingRequestCard } from '../components/CookBookingRequestCard';
import { CustomerBookingRequestCard } from '../components/CustomerBookingRequestCard';
import { fixtureAdminRequest, fixtureCookRequest, fixtureCookRequestDeclined, fixtureCustomerRequest } from './fixtures/booking';

const meta = {
    title: 'Perspectives/Request Cards',
    decorators: [perspectivesCanvasDecorator],
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function RoleColumn({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid min-w-0 gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{label}</h3>
            <div className="max-w-md">{children}</div>
        </div>
    );
}

export const SideBySide: Story = {
    render: () => (
        <div className="grid gap-8 lg:grid-cols-3">
            <RoleColumn label="Customer">
                <CustomerBookingRequestCard request={fixtureCustomerRequest} />
            </RoleColumn>
            <RoleColumn label="Cook (open pool)">
                <CookBookingRequestCard request={fixtureCookRequest} variant="open" />
            </RoleColumn>
            <RoleColumn label="Admin">
                <AdminBookingRequestListCard request={fixtureAdminRequest} />
            </RoleColumn>
        </div>
    ),
};

export const CookDeclinedVsCustomer: Story = {
    render: () => (
        <div className="grid gap-8 md:grid-cols-2">
            <RoleColumn label="Cook (declined)">
                <CookBookingRequestCard request={fixtureCookRequestDeclined} variant="declined" />
            </RoleColumn>
            <RoleColumn label="Customer (still open)">
                <CustomerBookingRequestCard request={fixtureCustomerRequest} />
            </RoleColumn>
        </div>
    ),
};
