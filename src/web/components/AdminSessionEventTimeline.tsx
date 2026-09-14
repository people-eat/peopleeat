import { Link } from '@tanstack/react-router';

import { formatDateTime } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';

export type AdminSessionEventTimelineItem = {
    sessionEventId: string;
    sessionId: string;
    type: string;
    descriptionDe: string;
    descriptionEn: string;
    createdAt: string;
    link?: string | null;
};

function EventDeepLink({ link }: { link: string }) {
    const locale = useLocale();
    const bookingMatch = /^\/admin\/booking-requests\/([^/]+)$/.exec(link);
    if (!bookingMatch?.[1]) return null;
    return (
        <Link
            to="/{-$locale}/admin/booking-requests/$bookingRequestId"
            params={{ bookingRequestId: bookingMatch[1] }}
            className="text-foreground underline"
        >
            {{ de: 'Öffnen', en: 'Open' }[locale]}
        </Link>
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

    if (events.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }

    return (
        <ol className="grid gap-4">
            {events.map((event) => {
                const description = locale === 'de' ? event.descriptionDe : event.descriptionEn;
                return (
                    <li key={event.sessionEventId} className="grid gap-1 border-b border-border pb-4 last:border-b-0 last:pb-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{event.type}</span>
                            <time className="text-xs text-muted-foreground">
                                {formatDateTime(event.createdAt, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' })}
                            </time>
                        </div>
                        <p className="text-sm text-foreground">{description}</p>
                        <div className="flex flex-wrap gap-3 text-sm">
                            {event.link ? <EventDeepLink link={event.link} /> : null}
                            {showSessionLink ? (
                                <Link
                                    to="/{-$locale}/admin/sessions/$sessionId"
                                    params={{ sessionId: event.sessionId }}
                                    className="text-muted-foreground underline"
                                >
                                    {{ de: 'Sitzung', en: 'Session' }[locale]}
                                </Link>
                            ) : null}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
