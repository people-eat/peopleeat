import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC, fixtureMenuImageD } from '../storybook/fixtures/people';
import { OfferSuggestedMenuCard } from './OfferSuggestedMenuCard';

const menuFixture = {
    menuId: 'menuFixture00000001',
    title: 'Herbstmenü mit Trüffel',
    description: 'Kürbis, Pilze und hausgemachte Pasta mit saisonalen Beilagen.',
    courseCount: 4,
    courseMealOptionImages: [fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC, fixtureMenuImageD],
};

const meta = {
    title: 'Booking/Suggested Menu Card',
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function SelectableCard({ selected: initialSelected, disabled }: { selected: boolean; disabled?: boolean }) {
    const [selected, setSelected] = useState(initialSelected);
    return (
        <ul className="grid gap-2">
            <OfferSuggestedMenuCard menu={menuFixture} selected={selected} disabled={disabled} onSelect={() => setSelected(true)} />
        </ul>
    );
}

export const Selected: Story = {
    render: () => <SelectableCard selected />,
};

export const Disabled: Story = {
    render: () => <SelectableCard selected={false} disabled />,
};
