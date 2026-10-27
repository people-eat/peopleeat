import type { Meta, StoryObj } from '@storybook/react-vite';

import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';
import { AdminBookingRequestOfferCard } from '../components/AdminBookingRequestOfferCard';
import { CookBookingRequestOfferCard } from '../components/CookBookingRequestOfferCard';
import { CustomerBookingRequestOfferCard } from '../components/CustomerBookingRequestOfferCard';
import { fixtureAdminOffer, fixtureBookingRequestId, fixtureCookOffer, fixtureCustomerOffer } from './fixtures/booking';
import { RoleColumn } from './gallery';

const meta = {
    title: 'Perspectives/Offer Cards',
    decorators: [perspectivesCanvasDecorator],
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SideBySide: Story = {
    render: () => (
        <div className="grid gap-8 lg:grid-cols-3">
            <RoleColumn label="Customer" contentClassName="max-w-sm">
                <CustomerBookingRequestOfferCard
                    bookingRequestId={fixtureBookingRequestId}
                    offer={fixtureCustomerOffer}
                    interactive={false}
                />
            </RoleColumn>
            <RoleColumn label="Cook" contentClassName="max-w-sm">
                <CookBookingRequestOfferCard offer={fixtureCookOffer} />
            </RoleColumn>
            <RoleColumn label="Admin" contentClassName="max-w-sm">
                <AdminBookingRequestOfferCard bookingRequestId={fixtureBookingRequestId} offer={fixtureAdminOffer} />
            </RoleColumn>
        </div>
    ),
};
