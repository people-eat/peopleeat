import type { DocumentInput } from '@urql/core';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { isCallJoinable } from '../../shared';
import type { BookingWhenPeer } from '../../shared';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';
import { Button } from './base/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from './base/card';
import { StatusAlert } from './base/status-alert';
import { BookingRequestOfferCallVideo } from './BookingRequestOfferCallPanel';
import { useBookingRequestOfferCallSession } from './BookingRequestOfferCallSession';
import type { BookingRequestOfferScheduleCallBooking, BookingRequestOfferScheduleCallSlot } from './BookingRequestOfferScheduleTab';
import {
    bookingOfferCallCardClassName,
    bookingOfferCallCardSectionClassName,
    BookingRequestOfferScheduleTab,
} from './BookingRequestOfferScheduleTab';

type BookingRequestOfferCallRoom = {
    bookingRequestOfferCallRoomId: string;
    status: 'ACTIVE' | 'ENDED';
} | null;

export type BookingRequestOfferCallTabProps = {
    role: 'user' | 'cook' | 'admin';
    bookingRequestOfferId: string;
    callBookings: readonly BookingRequestOfferScheduleCallBooking[];
    activeCallRoom: BookingRequestOfferCallRoom;
    /** When false, only the live/start surface is shown (no schedule section). */
    showSchedule?: boolean;
    callSchedulingEnabled?: boolean;
    callDurationMinutes?: number;
    callSlots?: readonly BookingRequestOfferScheduleCallSlot[];
    peerDisplayName?: string;
    callTimePeers?: readonly BookingWhenPeer[];
    occasion?: string | null;
    bookingRequestId?: string;
    requestDocument?: DocumentInput;
    confirmDocument?: DocumentInput;
    declineDocument?: DocumentInput;
    cancelDocument?: DocumentInput;
    /** Admin recordings (or other extras) below the schedule section. */
    children?: ReactNode;
};

export function BookingRequestOfferCallTab({
    role,
    bookingRequestOfferId,
    callBookings,
    activeCallRoom,
    showSchedule = true,
    callSchedulingEnabled = false,
    callDurationMinutes = 30,
    callSlots,
    peerDisplayName,
    callTimePeers,
    occasion,
    bookingRequestId,
    requestDocument,
    confirmDocument,
    declineDocument,
    cancelDocument,
    children,
}: BookingRequestOfferCallTabProps) {
    const { t } = useT('common');
    const { inCall, busy, startOrJoin } = useBookingRequestOfferCallSession();

    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const hasLiveRoom = activeCallRoom != null && activeCallRoom.status === 'ACTIVE';
    const joinableBooking = callBookings.find((booking) => isCallJoinable(booking, now)) ?? null;

    if (inCall) {
        return (
            <div className="grid gap-3">
                <StatusAlert tone="info" title={t('callTab.recordingOn')}>
                    {t('callTab.recordedForQuality')}
                </StatusAlert>
                <BookingRequestOfferCallVideo />
            </div>
        );
    }

    return (
        <div className="grid max-w-xl gap-8">
            <div className="grid gap-4">
                {/* Temporarily hidden — re-enable when we want the recording notice again (see docs/features/call-recordings.md).
                <StatusAlert tone="info" title={t('callTab.recordingNotice')}>
                    {t('callTab.discoveryRecorded')}
                </StatusAlert>
                */}
                {hasLiveRoom ? (
                    <StatusAlert
                        tone="info"
                        title={t('callTab.inProgress')}
                        action={
                            <Button type="button" size="sm" disabled={busy} onClick={() => void startOrJoin('join', hasLiveRoom)}>
                                {t('callTab.join')}
                            </Button>
                        }
                    >
                        {t('callTab.activeCall')}
                    </StatusAlert>
                ) : null}

                <Card className={bookingOfferCallCardClassName}>
                    <CardHeader className={bookingOfferCallCardSectionClassName}>
                        <CardTitle>{hasLiveRoom ? t('callTab.joinActive') : t('callTab.startCall')}</CardTitle>
                        <CardDescription>
                            {hasLiveRoom
                                ? t('callTab.joinLive')
                                : joinableBooking
                                  ? t('callTab.readyToJoin')
                                  : t('callTab.startSpontaneous')}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className={cn('justify-end', bookingOfferCallCardSectionClassName)}>
                        {hasLiveRoom ? (
                            <Button type="button" disabled={busy} onClick={() => void startOrJoin('join', hasLiveRoom)}>
                                {t('callTab.join')}
                            </Button>
                        ) : (
                            <Button type="button" disabled={busy} onClick={() => void startOrJoin('create', hasLiveRoom)}>
                                {joinableBooking ? t('callTab.startScheduled') : t('callTab.startAdHoc')}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>

            {showSchedule ? (
                <div className="grid gap-4 border-t border-border pt-8">
                    <BookingRequestOfferScheduleTab
                        role={role}
                        bookingRequestOfferId={bookingRequestOfferId}
                        callBookings={callBookings}
                        callSchedulingEnabled={callSchedulingEnabled}
                        callDurationMinutes={callDurationMinutes}
                        callSlots={callSlots}
                        peerDisplayName={peerDisplayName}
                        callTimePeers={callTimePeers}
                        occasion={occasion}
                        bookingRequestId={bookingRequestId}
                        requestDocument={requestDocument}
                        confirmDocument={confirmDocument}
                        declineDocument={declineDocument}
                        cancelDocument={cancelDocument}
                    />
                </div>
            ) : null}

            {children ? <div className="grid gap-4 border-t border-border pt-8">{children}</div> : null}
        </div>
    );
}
