import type { Meta, StoryObj } from '@storybook/react-vite';

import { cardCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureMealImage } from '../storybook/fixtures/people';
import { CustomerMealCard } from './CustomerMealCard';

const meta = {
    title: 'Discovery/Meal Card',
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const mealCopy = {
    title: 'Gebratene Ente mit Rotkohl',
    description: 'Saftige Entenbrust mit Apfel-Rotkohl, Kartoffelklößen und Portwein-Jus.',
};

export const Default: Story = {
    render: () => (
        <div className="max-w-xs">
            <CustomerMealCard {...mealCopy} imageUrl={fixtureMealImage} />
        </div>
    ),
};

export const Marketing: Story = {
    render: () => (
        <div className="max-w-xs">
            <CustomerMealCard {...mealCopy} imageUrl={fixtureMealImage} variant="marketing" />
        </div>
    ),
};
