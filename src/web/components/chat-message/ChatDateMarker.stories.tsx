import type { Meta, StoryObj } from '@storybook/react-vite';

import { useLocale } from '../../hooks/useLocale';
import { ChatDateMarker } from './ChatDateMarker';

function shiftLocalDay(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function localDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function DateMarkerGallery() {
    const locale = useLocale();
    const now = new Date();
    const today = localDayKey(now);
    const yesterday = localDayKey(shiftLocalDay(now, -1));
    const older = '2025-03-15';

    return (
        <div className="flex max-w-md flex-col gap-4 py-2">
            <ChatDateMarker date={today} locale={locale} />
            <ChatDateMarker date={yesterday} locale={locale} />
            <ChatDateMarker date={older} locale={locale} />
        </div>
    );
}

const meta = {
    title: 'Chat/Date Marker',
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TodayYesterdayOlder: Story = {
    render: () => <DateMarkerGallery />,
};
