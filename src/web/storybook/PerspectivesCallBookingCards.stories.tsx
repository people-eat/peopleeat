import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { perspectivesCanvasDecorator, STORYBOOK_TIME_ZONE } from '../../../.storybook/decorators';
import { BookingRequestOfferCallBookingCard } from '../components/BookingRequestOfferCallBookingCard';
import type { BookingRequestOfferCallBookingCardRole } from '../components/BookingRequestOfferCallBookingCard';
import { useLocale } from '../hooks/useLocale';
import { callBookingsByStatus } from './fixtures/calls';
import { fixtureCook, fixtureCustomer } from './fixtures/people';

const meta = {
    title: 'Perspectives/Call Booking Cards',
    decorators: [perspectivesCanvasDecorator],
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function RoleColumn({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid min-w-0 gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{label}</h3>
            <div className="max-w-md">{children}</div>
        </div>
    );
}

function CallCardForRole({
    role,
    peerDisplayName,
    booking = callBookingsByStatus.pendingFromCustomer,
    readOnly = false,
}: {
    role: BookingRequestOfferCallBookingCardRole;
    peerDisplayName: string;
    booking?: (typeof callBookingsByStatus)[keyof typeof callBookingsByStatus];
    readOnly?: boolean;
}) {
    const locale = useLocale();
    const [decliningId, setDecliningId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    return (
        <BookingRequestOfferCallBookingCard
            booking={booking}
            role={role}
            locale={locale}
            timeZone={STORYBOOK_TIME_ZONE}
            callDurationMinutes={30}
            peerDisplayName={peerDisplayName}
            busy={false}
            decliningId={decliningId}
            declineReason={declineReason}
            cancelingId={cancelingId}
            cancelReason={cancelReason}
            readOnly={readOnly}
            setDecliningId={setDecliningId}
            setDeclineReason={setDeclineReason}
            setCancelingId={setCancelingId}
            setCancelReason={setCancelReason}
            onConfirm={async () => undefined}
            onDecline={async () => {
                setDecliningId(null);
            }}
            onCancel={async () => {
                setCancelingId(null);
            }}
        />
    );
}

export const PendingFromCustomer: Story = {
    name: 'Pending (customer initiated)',
    render: () => (
        <div className="grid gap-8 lg:grid-cols-3">
            <RoleColumn label="Customer">
                <CallCardForRole role="user" peerDisplayName={fixtureCook.display} />
            </RoleColumn>
            <RoleColumn label="Cook">
                <CallCardForRole role="cook" peerDisplayName={fixtureCustomer.display} />
            </RoleColumn>
            <RoleColumn label="Admin">
                <CallCardForRole role="admin" peerDisplayName={`${fixtureCustomer.display} · ${fixtureCook.display}`} />
            </RoleColumn>
        </div>
    ),
};

export const ConfirmedReadOnly: Story = {
    render: () => (
        <div className="grid gap-8 lg:grid-cols-3">
            <RoleColumn label="Customer">
                <CallCardForRole role="user" peerDisplayName={fixtureCook.display} booking={callBookingsByStatus.confirmed} readOnly />
            </RoleColumn>
            <RoleColumn label="Cook">
                <CallCardForRole role="cook" peerDisplayName={fixtureCustomer.display} booking={callBookingsByStatus.confirmed} readOnly />
            </RoleColumn>
            <RoleColumn label="Admin">
                <CallCardForRole
                    role="admin"
                    peerDisplayName={`${fixtureCustomer.display} · ${fixtureCook.display}`}
                    booking={callBookingsByStatus.confirmed}
                    readOnly
                />
            </RoleColumn>
        </div>
    ),
};
