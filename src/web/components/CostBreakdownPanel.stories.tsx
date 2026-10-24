import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { useLocale } from '../hooks/useLocale';
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

    return (
        <CostBreakdownPanel
            locale={locale}
            lineItems={[
                { title: { de: 'Menü (3 Erwachsene)', en: 'Menu (3 adults)' }[locale], amountCents: 28500 },
                { title: { de: 'Menü (1 Kind)', en: 'Menu (1 child)' }[locale], amountCents: 6500 },
                { title: { de: 'Anreise', en: 'Travel' }[locale], amountCents: 1800 },
                { title: { de: 'Servicegebühr', en: 'Service fee' }[locale], amountCents: 7200 },
            ]}
            total={{ title: { de: 'Gesamt', en: 'Total' }[locale], amountCents: 48000 }}
            footer={
                {
                    de: 'Die An- und Abreise sind im Gesamtpreis inkludiert',
                    en: 'Travel to and from the venue is included in the total price',
                }[locale]
            }
        />
    );
}

export const Default: Story = {
    render: () => <CostBreakdownStory />,
};
