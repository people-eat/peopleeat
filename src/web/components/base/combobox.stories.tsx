import type { Meta, StoryObj } from '@storybook/react-vite';

import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from './combobox';

type Framework = {
    value: string;
    label: string;
};

const frameworks: Framework[] = [
    { value: 'next.js', label: 'Next.js' },
    { value: 'sveltekit', label: 'SvelteKit' },
    { value: 'nuxt.js', label: 'Nuxt.js' },
    { value: 'remix', label: 'Remix' },
    { value: 'astro', label: 'Astro' },
];

function ComboboxDemo() {
    return (
        <div className="w-[240px]">
            <Combobox items={frameworks} itemToStringLabel={(framework: Framework) => framework.label}>
                <ComboboxInput placeholder="Select framework…" />
                <ComboboxContent>
                    <ComboboxEmpty>No framework found.</ComboboxEmpty>
                    <ComboboxList>
                        {(framework: Framework) => (
                            <ComboboxItem key={framework.value} value={framework}>
                                {framework.label}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>
    );
}

const meta = {
    title: 'Base/Combobox',
    component: ComboboxDemo,
    tags: ['autodocs'],
} satisfies Meta<typeof ComboboxDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
