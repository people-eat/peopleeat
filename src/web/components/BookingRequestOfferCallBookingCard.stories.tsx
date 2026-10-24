import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { cardCanvasDecorator, STORYBOOK_TIME_ZONE } from '../../../.storybook/decorators';
import { useLocale } from '../hooks/useLocale';
import { callBookingsByStatus } from '../storybook/fixtures/calls';
import { fixtureCook, fixtureCustomer } from '../storybook/fixtures/people';
import { BookingRequestOfferCallBookingCard } from './BookingRequestOfferCallBookingCard';
import type { BookingRequestOfferCallBookingCardRole } from './BookingRequestOfferCallBookingCard';

const meta = {
    title: 'Booking/Call Booking Card',
    tags: ['autodocs'],
    decorators: [cardCanvasDecorator],
    args: {
        role: 'user' satisfies BookingRequestOfferCallBookingCardRole,
    },
    argTypes: {
        role: { control: 'select', options: ['user', 'cook', 'admin'] satisfies BookingRequestOfferCallBookingCardRole[] },
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noopAsync = async () => {};

function peerNameForRole(role: BookingRequestOfferCallBookingCardRole): string {
    if (role === 'cook') return fixtureCustomer.display;
    return fixtureCook.display;
}

function CallBookingCardInteractive({ role }: { role: BookingRequestOfferCallBookingCardRole }) {
    const locale = useLocale();
    const [decliningId, setDecliningId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    return (
        <BookingRequestOfferCallBookingCard
            booking={callBookingsByStatus.pendingFromCook}
            role={role}
            locale={locale}
            timeZone={STORYBOOK_TIME_ZONE}
            callDurationMinutes={30}
            peerDisplayName={peerNameForRole(role)}
            busy={false}
            decliningId={decliningId}
            declineReason={declineReason}
            cancelingId={cancelingId}
            cancelReason={cancelReason}
            readOnly={false}
            setDecliningId={setDecliningId}
            setDeclineReason={setDeclineReason}
            setCancelingId={setCancelingId}
            setCancelReason={setCancelReason}
            onConfirm={noopAsync}
            onDecline={noopAsync}
            onCancel={noopAsync}
        />
    );
}

function CallBookingStatusMatrix({ role }: { role: BookingRequestOfferCallBookingCardRole }) {
    const locale = useLocale();
    const bookings = Object.values(callBookingsByStatus);

    return (
        <div className="grid gap-4">
            {bookings.map((booking) => (
                <BookingRequestOfferCallBookingCard
                    key={booking.cookCallSlotBookingId}
                    booking={booking}
                    role={role}
                    locale={locale}
                    timeZone={STORYBOOK_TIME_ZONE}
                    callDurationMinutes={30}
                    peerDisplayName={peerNameForRole(role)}
                    busy={false}
                    decliningId={null}
                    declineReason=""
                    cancelingId={null}
                    cancelReason=""
                    readOnly
                    setDecliningId={() => {}}
                    setDeclineReason={() => {}}
                    setCancelingId={() => {}}
                    setCancelReason={() => {}}
                    onConfirm={noopAsync}
                    onDecline={noopAsync}
                    onCancel={noopAsync}
                />
            ))}
        </div>
    );
}

export const StatusMatrix: Story = {
    render: (args) => <CallBookingStatusMatrix role={(args as { role: BookingRequestOfferCallBookingCardRole }).role} />,
};

export const PendingInteractive: Story = {
    render: (args) => <CallBookingCardInteractive role={(args as { role: BookingRequestOfferCallBookingCardRole }).role} />,
};
