import type { Meta, StoryObj } from '@storybook/react-vite';

import { fixtureCook, fixtureCookAlt } from '../storybook/fixtures/people';
import { CookProfileTags } from './CookProfileTags';

const meta = {
    title: 'Discovery/Cook Profile Tags',
    component: CookProfileTags,
    tags: ['autodocs'],
} satisfies Meta<typeof CookProfileTags>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        cuisineStyle: fixtureCook.cuisineStyle,
        cookingPhilosophy: fixtureCook.cookingPhilosophy,
    },
};

export const CuisineOnly: Story = {
    args: {
        cuisineStyle: fixtureCookAlt.cuisineStyle,
        cookingPhilosophy: null,
    },
};

export const MediumSize: Story = {
    args: {
        cuisineStyle: fixtureCook.cuisineStyle,
        cookingPhilosophy: fixtureCook.cookingPhilosophy,
        size: 'md',
    },
};
