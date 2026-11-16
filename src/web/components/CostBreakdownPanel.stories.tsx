import type { Meta, StoryObj } from '@storybook/react-vite';
import { cardCanvasDecorator } from '../../../.storybook/decorators';

import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { CostBreakdownPanel } from './CostBreakdownPanel';

const meta = {
    title: 'Booking/Cost Breakdown',
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function CostBreakdownStory() {
    const locale = useLocale();
    const { t } = useT('common');

    return (
        <CostBreakdownPanel
            locale={locale}
            lineItems={[
                { title: t('storybook.bookingDesk.menuAdults'), amountCents: 28500 },
                { title: t('storybook.bookingDesk.menuChild'), amountCents: 6500 },
                { title: t('storybook.bookingDesk.travel'), amountCents: 1800 },
                { title: t('storybook.bookingDesk.serviceFee'), amountCents: 7200 },
            ]}
            total={{ title: t('storybook.bookingDesk.total'), amountCents: 48000 }}
            footer={t('storybook.bookingDesk.travelIncluded')}
        />
    );
}

export const Default: Story = {
    render: () => <CostBreakdownStory />,
};
