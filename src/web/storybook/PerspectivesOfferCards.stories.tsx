import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';
import { AdminBookingRequestOfferCard } from '../components/AdminBookingRequestOfferCard';
import { CookBookingRequestOfferCard } from '../components/CookBookingRequestOfferCard';
import { CustomerBookingRequestOfferCard } from '../components/CustomerBookingRequestOfferCard';
import { fixtureAdminOffer, fixtureBookingRequestId, fixtureCookOffer, fixtureCustomerOffer } from './fixtures/booking';

const meta = {
    title: 'Perspectives/Offer Cards',
    decorators: [perspectivesCanvasDecorator],
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function RoleColumn({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid min-w-0 gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{label}</h3>
            <div className="max-w-sm">{children}</div>
        </div>
    );
}

export const SideBySide: Story = {
    render: () => (
        <div className="grid gap-8 lg:grid-cols-3">
            <RoleColumn label="Customer">
                <CustomerBookingRequestOfferCard
                    bookingRequestId={fixtureBookingRequestId}
                    offer={fixtureCustomerOffer}
                    interactive={false}
                />
            </RoleColumn>
            <RoleColumn label="Cook">
                <CookBookingRequestOfferCard offer={fixtureCookOffer} />
            </RoleColumn>
            <RoleColumn label="Admin">
                <AdminBookingRequestOfferCard bookingRequestId={fixtureBookingRequestId} offer={fixtureAdminOffer} />
            </RoleColumn>
        </div>
    ),
};
