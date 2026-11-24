import { Link } from '@tanstack/react-router';

import { t } from '../../i18n/t';
import { formatDateTime } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { Badge } from './base/badge';
import { Button } from './base/button';

export type AdminSessionEventTimelineItem = {
    sessionEventId: string;
    sessionId: string;
    type: string;
    description: string;
    createdAt: string;
    link?: string | null;
    isImpersonation?: boolean;
};

function EventDeepLink({ link }: { link: string }) {
    const locale = useLocale();
    const bookingMatch = /^\/admin\/booking-requests\/([^/]+)$/.exec(link);
    if (!bookingMatch?.[1]) return null;
    return (
        <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/{-$locale}/admin/booking-requests/$bookingRequestId" params={{ bookingRequestId: bookingMatch[1] }}>
                {t(locale, 'admin', 'copy.open2')}
            </Link>
        </Button>
    );
}

export function AdminSessionEventTimeline({
    events,
    emptyLabel,
    showSessionLink,
}: {
    events: readonly AdminSessionEventTimelineItem[];
    emptyLabel: string;
    showSessionLink?: boolean;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const sessionLabel = t(locale, 'admin', 'copy.session');
    const impersonationLabel = t(locale, 'admin', 'copy.impersonation');

    if (events.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }

    return (
        <ol className="divide-y divide-border overflow-hidden rounded-xl border">
            {events.map((event) => {
                return (
                    <li key={event.sessionEventId} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="grid min-w-0 gap-0.5">
                            <p className="truncate text-sm font-medium text-foreground">{event.description}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="font-mono">
                                    {event.type}
                                </Badge>
                                {event.isImpersonation ? (
                                    <Badge variant="outline" className="bg-muted">
                                        {impersonationLabel}
                                    </Badge>
                                ) : null}
                                <time className="tabular-nums">
                                    {formatDateTime(event.createdAt, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' })}
                                </time>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {event.link ? <EventDeepLink link={event.link} /> : null}
                            {showSessionLink ? (
                                <Button type="button" variant="ghost" size="sm" asChild>
                                    <Link to="/{-$locale}/admin/sessions/$sessionId" params={{ sessionId: event.sessionId }}>
                                        {sessionLabel}
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
