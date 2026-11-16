import { Link } from '@tanstack/react-router';
import { VideoIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { formatDate, formatTime } from '../../../shared';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/base/card';
import { bookingOfferCallCardClassName, bookingOfferCallCardSectionClassName } from '../../components/BookingRequestOfferScheduleTab';
import type { GqlCAdminCallListItemKind, GqlCAdminCallsAttentionCallFragment } from '../../graphql/generated';
import { AdminCallsAttentionUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { cn } from '../../utils/cn';
import type { Locale } from '../../utils/locale';

const STALE_PENDING_MS = 24 * 60 * 60_000;

export type AdminCallsAttentionRow = GqlCAdminCallsAttentionCallFragment;

function formatSlotWhen(startAt: string, endAt: string, locale: Locale, timeZone: string): string {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
    const datePart = formatDate(start, { locale, timeZone, weekday: true });
    return `${datePart} · ${formatTime(startAt, { locale, timeZone })}–${formatTime(endAt, { locale, timeZone })}${locale === 'de' ? ' Uhr' : ''}`;
}

export function adminCallKindLabel(kind: GqlCAdminCallListItemKind, locale: Locale): string {
    return t(locale, 'admin', `calls.attention.${kind}`);
}

function sectionLabel(kind: 'live' | 'pending' | 'upcoming' | 'recent', locale: Locale): string {
    return t(locale, 'admin', `calls.attention.${kind}`);
}

function offerDeepLink(item: AdminCallsAttentionRow) {
    return {
        to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId' as const,
        params: {
            bookingRequestId: item.bookingRequestId,
            bookingRequestOfferId: item.bookingRequestOfferId,
        },
        search: { tab: 'call' as const },
    };
}

function callDeepLink(item: AdminCallsAttentionRow) {
    const roomId = item.callRoom?.bookingRequestOfferCallRoomId ?? item.callSlotBooking?.videoCallRoomId ?? null;
    if (roomId == null) return null;
    return {
        to: '/{-$locale}/admin/calls/$bookingRequestOfferCallRoomId' as const,
        params: { bookingRequestOfferCallRoomId: roomId },
    };
}

function isStalePending(item: AdminCallsAttentionRow, now: number): boolean {
    if (item.kind !== 'PENDING' || item.callSlotBooking == null) return false;
    const createdAt = new Date(item.callSlotBooking.createdAt).getTime();
    if (Number.isNaN(createdAt)) return false;
    return now - createdAt >= STALE_PENDING_MS;
}

function CallRow({ item, locale, timeZone, now }: { item: AdminCallsAttentionRow; locale: Locale; timeZone: string; now: number }) {
    const isLive = item.kind === 'LIVE';
    const isPending = item.kind === 'PENDING';
    const slot = item.callSlotBooking;
    const room = item.callRoom;
    const when =
        slot != null
            ? formatSlotWhen(slot.startAt, slot.endAt, locale, timeZone)
            : room != null
              ? `${formatDate(room.startedAt, { locale, timeZone, weekday: true })} · ${formatTime(room.startedAt, { locale, timeZone })}${locale === 'de' ? ' Uhr' : ''}`
              : '—';
    const awaitingLabel =
        isPending && slot != null
            ? slot.initiator === 'CUSTOMER'
                ? t(locale, 'admin', 'copy.awaitingChef')
                : t(locale, 'admin', 'copy.awaitingCustomer')
            : null;
    const stale = isStalePending(item, now);
    const callLink = callDeepLink(item);

    return (
        <li>
            <Card className={bookingOfferCallCardClassName}>
                <CardHeader className={bookingOfferCallCardSectionClassName}>
                    <div className="grid min-w-0 gap-0.5">
                        <CardTitle className="truncate font-medium">{item.occasion || '—'}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {item.cookDisplayName} · {item.customerDisplayName}
                        </p>
                        <CardDescription className="text-xs">{when}</CardDescription>
                    </div>
                    <CardAction>
                        <div className="flex flex-wrap justify-end gap-2">
                            <Badge variant={isLive || isPending ? 'default' : 'outline'}>{adminCallKindLabel(item.kind, locale)}</Badge>
                            {awaitingLabel ? <Badge variant="secondary">{awaitingLabel}</Badge> : null}
                            {stale ? <Badge variant="destructive">{t(locale, 'admin', 'copy.n24h')}</Badge> : null}
                        </div>
                    </CardAction>
                </CardHeader>
                <CardFooter className={cn('flex-wrap justify-end gap-2', bookingOfferCallCardSectionClassName)}>
                    {isLive ? (
                        <Button type="button" size="sm" asChild>
                            <Link {...offerDeepLink(item)}>{t(locale, 'admin', 'copy.join')}</Link>
                        </Button>
                    ) : null}
                    {callLink != null ? (
                        <Button type="button" size="sm" variant="outline" asChild>
                            <Link {...callLink}>{t(locale, 'admin', 'copy.openCall')}</Link>
                        </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" asChild>
                        <Link {...offerDeepLink(item)}>{t(locale, 'admin', 'copy.openOffer2')}</Link>
                    </Button>
                </CardFooter>
            </Card>
        </li>
    );
}

function CallSection({
    title,
    items,
    locale,
    timeZone,
    empty,
    now,
}: {
    title: string;
    items: AdminCallsAttentionRow[];
    locale: Locale;
    timeZone: string;
    empty: string;
    now: number;
}) {
    return (
        <section className="grid gap-3">
            <h3 className="text-base font-medium text-foreground">{title}</h3>
            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{empty}</p>
            ) : (
                <ul className="grid gap-3">
                    {items.map((item) => (
                        <CallRow
                            key={`${item.kind}-${item.bookingRequestOfferId}-${item.callRoom?.bookingRequestOfferCallRoomId ?? item.callSlotBooking?.cookCallSlotBookingId ?? 'row'}`}
                            item={item}
                            locale={locale}
                            timeZone={timeZone}
                            now={now}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

/** Live attention board for the calls overview — seed + `adminUpdates` subscription. */
export function AdminCallsAttentionBoard({ seedCalls }: { seedCalls: AdminCallsAttentionRow[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const [calls, setCalls] = useState(seedCalls);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        setCalls(seedCalls);
    }, [seedCalls]);

    useEffect(() => {
        const request = createRequest(AdminCallsAttentionUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates;
                if (next) setCalls(next.calls);
            }),
        );
        return unsubscribe;
    }, [client]);

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const live = calls.filter((item) => item.kind === 'LIVE');
    const pending = calls.filter((item) => item.kind === 'PENDING');
    const upcoming = calls.filter((item) => item.kind === 'UPCOMING');
    const recent = calls.filter((item) => item.kind === 'RECENT_ROOM' || item.kind === 'RECENT_SLOT');

    return (
        <div className="grid gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
                <VideoIcon className="size-5" aria-hidden />
                <p className="text-sm">{t(locale, 'admin', 'copy.liveCallsPendingSlotRequestsAndUpcomingAppointments')}</p>
            </div>

            <CallSection
                title={sectionLabel('live', locale)}
                items={live}
                locale={locale}
                timeZone={timeZone}
                empty={t(locale, 'admin', 'copy.noLiveCalls')}
                now={now}
            />
            <CallSection
                title={sectionLabel('pending', locale)}
                items={pending}
                locale={locale}
                timeZone={timeZone}
                empty={t(locale, 'admin', 'copy.noPendingCallRequests')}
                now={now}
            />
            <CallSection
                title={sectionLabel('upcoming', locale)}
                items={upcoming}
                locale={locale}
                timeZone={timeZone}
                empty={t(locale, 'admin', 'copy.noUpcomingAppointments')}
                now={now}
            />
            <CallSection
                title={sectionLabel('recent', locale)}
                items={recent}
                locale={locale}
                timeZone={timeZone}
                empty={t(locale, 'admin', 'copy.noRecentCalls')}
                now={now}
            />
        </div>
    );
}
