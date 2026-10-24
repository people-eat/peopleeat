import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { useLocale } from '../hooks/useLocale';
import { BookingRequestOfferCostOverviewPanel } from './BookingRequestOfferPriceConfigurationPanel';

const meta = {
    title: 'Booking/Cost Overview',
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sharedPricing = {
    participantsAdult: 2,
    participantsDiscounted: 1,
    pricePerPersonCents: 9500,
    travelExpensesCents: 1800,
    menuPriceCents: 28500,
};

function CookViewer() {
    const locale = useLocale();
    return <BookingRequestOfferCostOverviewPanel locale={locale} viewer="cook" {...sharedPricing} />;
}

function AdminViewer() {
    const locale = useLocale();
    return <BookingRequestOfferCostOverviewPanel locale={locale} viewer="admin" {...sharedPricing} />;
}

export const BookingRequestOfferCostOverviewPanelCook: Story = {
    name: 'Cook viewer',
    render: () => <CookViewer />,
};

export const BookingRequestOfferCostOverviewPanelAdmin: Story = {
    name: 'Admin viewer',
    render: () => <AdminViewer />,
};
