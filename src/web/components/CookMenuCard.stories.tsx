import type { Meta, StoryObj } from '@storybook/react-vite';

import { perspectivesCanvasDecorator } from '../../../.storybook/decorators';
import { fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC, fixtureMenuImageD } from '../storybook/fixtures/people';
import { CookMenuCardMedia } from './CookMenuCard';

const meta = {
    title: 'Discovery/Menu Card Media',
    component: CookMenuCardMedia,
    tags: ['autodocs'],
    decorators: [perspectivesCanvasDecorator],
} satisfies Meta<typeof CookMenuCardMedia>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ZeroImages: Story = {
    args: { images: [] },
};

export const OneImage: Story = {
    args: { images: [fixtureMenuImageA] },
};

export const TwoImages: Story = {
    args: { images: [fixtureMenuImageA, fixtureMenuImageB] },
};

export const ThreeImages: Story = {
    args: { images: [fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC] },
};

export const FourImages: Story = {
    args: { images: [fixtureMenuImageA, fixtureMenuImageB, fixtureMenuImageC, fixtureMenuImageD] },
};
