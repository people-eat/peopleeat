import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixturePublicCook } from '../storybook/fixtures/booking';
import { PublicCookCard } from './PublicCookCard';

const meta = {
    title: 'Discovery/Public Cook Card',
    component: PublicCookCard,
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta<typeof PublicCookCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRating: Story = {
    args: {
        cook: fixturePublicCook,
        interactive: false,
    },
};

export const WithoutRating: Story = {
    args: {
        cook: {
            ...fixturePublicCook,
            rating: undefined,
        },
        interactive: false,
    },
};
