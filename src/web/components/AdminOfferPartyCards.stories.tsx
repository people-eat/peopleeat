import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { useLocale } from '../hooks/useLocale';
import { fixtureAdminPartyCook, fixtureAdminPartyCustomer } from '../storybook/fixtures/booking';
import { AdminOfferPartyCards } from './AdminOfferPartyCards';

const meta = {
    title: 'Booking/Admin Offer Parties',
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function CookAndCustomerParties() {
    const locale = useLocale();
    return <AdminOfferPartyCards locale={locale} cook={fixtureAdminPartyCook} customer={fixtureAdminPartyCustomer} />;
}

function CookOnlyParties() {
    const locale = useLocale();
    return <AdminOfferPartyCards locale={locale} cook={fixtureAdminPartyCook} customer={null} />;
}

export const CookAndCustomer: Story = {
    render: () => <CookAndCustomerParties />,
};

export const CustomerNull: Story = {
    render: () => <CookOnlyParties />,
};
