import type { DocumentInput } from '@urql/core';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { isCallJoinable } from '../../shared';
import { useLocale } from '../hooks/useLocale';
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
    requestDocument,
    confirmDocument,
    declineDocument,
    cancelDocument,
    children,
}: BookingRequestOfferCallTabProps) {
    const locale = useLocale();
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
                <StatusAlert tone="info" title={{ de: 'Aufnahme aktiv', en: 'Recording on' }[locale]}>
                    {
                        {
                            de: 'Dieser Anruf wird für Qualität und Support aufgezeichnet. Nur Administratoren können die Aufnahme und das Transkript einsehen.',
                            en: 'This call is recorded for quality and support. Only administrators can access the recording and transcript.',
                        }[locale]
                    }
                </StatusAlert>
                <BookingRequestOfferCallVideo />
            </div>
        );
    }

    return (
        <div className="grid max-w-xl gap-8">
            <div className="grid gap-4">
                {/* Temporarily hidden — re-enable when we want the recording notice again (see docs/features/call-recordings.md).
                <StatusAlert tone="info" title={{ de: 'Hinweis zur Aufnahme', en: 'Recording notice' }[locale]}>
                    {
                        {
                            de: 'Discovery-Anrufe werden für Qualität und Support aufgezeichnet. Die Aufnahme und das Transkript sind nur für Administratoren sichtbar.',
                            en: 'Discovery calls are recorded for quality and support. Recordings and transcripts are visible to administrators only.',
                        }[locale]
                    }
                </StatusAlert>
                */}
                {hasLiveRoom ? (
                    <StatusAlert
                        tone="info"
                        title={{ de: 'Anruf läuft', en: 'Call in progress' }[locale]}
                        action={
                            <Button type="button" size="sm" disabled={busy} onClick={() => void startOrJoin('join', hasLiveRoom)}>
                                {{ de: 'Beitreten', en: 'Join' }[locale]}
                            </Button>
                        }
                    >
                        {
                            {
                                de: 'Ein Videoanruf für dieses Angebot ist aktiv.',
                                en: 'A video call for this offer is active.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : null}

                <Card className={bookingOfferCallCardClassName}>
                    <CardHeader className={bookingOfferCallCardSectionClassName}>
                        <CardTitle>
                            {
                                {
                                    de: hasLiveRoom ? 'Aktiven Anruf beitreten' : 'Gespräch starten',
                                    en: hasLiveRoom ? 'Join active call' : 'Start call',
                                }[locale]
                            }
                        </CardTitle>
                        <CardDescription>
                            {
                                {
                                    de: hasLiveRoom
                                        ? 'Tritt dem laufenden Videoanruf bei.'
                                        : joinableBooking
                                          ? 'Dein bestätigter Termin ist jetzt bereit. Du kannst beitreten.'
                                          : 'Starte einen spontanen Videoanruf mit der anderen Partei.',
                                    en: hasLiveRoom
                                        ? 'Join the live video call.'
                                        : joinableBooking
                                          ? 'Your confirmed appointment is ready to join.'
                                          : 'Start an ad-hoc video call with the other party.',
                                }[locale]
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className={cn('justify-end', bookingOfferCallCardSectionClassName)}>
                        {hasLiveRoom ? (
                            <Button type="button" disabled={busy} onClick={() => void startOrJoin('join', hasLiveRoom)}>
                                {{ de: 'Beitreten', en: 'Join' }[locale]}
                            </Button>
                        ) : (
                            <Button type="button" disabled={busy} onClick={() => void startOrJoin('create', hasLiveRoom)}>
                                {
                                    {
                                        de: joinableBooking ? 'Geplanten Anruf starten' : 'Spontanen Anruf starten',
                                        en: joinableBooking ? 'Start scheduled call' : 'Start ad-hoc call',
                                    }[locale]
                                }
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
