import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DatePicker } from './date-picker';

const PLACEHOLDER = 'Pick a date';

const meta = {
    title: 'Base/DatePicker',
    component: DatePicker,
    tags: ['autodocs'],
    args: {
        placeholder: PLACEHOLDER,
    },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker value={date} onValueChange={setDate} placeholder={PLACEHOLDER} />;
    },
};

export const WithInitialValue: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>(new Date());
        return <DatePicker value={date} onValueChange={setDate} placeholder={PLACEHOLDER} />;
    },
};

export const CustomPlaceholder: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker value={date} onValueChange={setDate} placeholder="Select your birthday" />;
    },
};

export const DisableWeekends: Story = {
    render: function Render() {
        const [date, setDate] = useState<Date | undefined>();
        return <DatePicker value={date} onValueChange={setDate} placeholder={PLACEHOLDER} disabled={[{ dayOfWeek: [0, 6] }]} />;
    },
};
