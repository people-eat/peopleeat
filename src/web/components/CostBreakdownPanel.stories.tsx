import type { Meta, StoryObj } from '@storybook/react-vite';
import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { inlineCopy } from '../../shared';

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
                { title: inlineCopy({ de: 'Menü (3 Erwachsene)', en: 'Menu (3 adults)' }, locale), amountCents: 28500 },
                { title: inlineCopy({ de: 'Menü (1 Kind)', en: 'Menu (1 child)' }, locale), amountCents: 6500 },
                { title: inlineCopy({ de: 'Anreise', en: 'Travel' }, locale), amountCents: 1800 },
                { title: inlineCopy({ de: 'Servicegebühr', en: 'Service fee' }, locale), amountCents: 7200 },
            ]}
            total={{ title: inlineCopy({ de: 'Gesamt', en: 'Total' }, locale), amountCents: 48000 }}
            footer={inlineCopy(
                {
                    de: 'Die An- und Abreise sind im Gesamtpreis inkludiert',
                    en: 'Travel to and from the venue is included in the total price',
                },
                locale,
            )}
        />
    );
}

export const Default: Story = {
    render: () => <CostBreakdownStory />,
};
