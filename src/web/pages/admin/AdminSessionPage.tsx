import { Link } from '@tanstack/react-router';

import { formatDate, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminSessionEventTimeline } from '../../components/AdminSessionEventTimeline';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminSessionPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';

export const adminSessionPageTitle = { de: 'Sitzung', en: 'Session' } as const;
export const adminSessionPageDescription = {
    de: 'Details einer Browser-Sitzung.',
    en: 'Details for a browser session.',
} as const;

export function adminSessionPageVariables(sessionId: string) {
    return {
        sessionId,
        eventsCriterion: {
            sessionIds: [sessionId],
            skip: 0,
            take: 100,
        },
    };
}

type AdminSessionDetail = NonNullable<NonNullable<NonNullable<GqlCAdminSessionPageQuery['currentSession']['user']>['admin']>['session']>;

export function AdminSessionPage({ data }: { data: GqlCAdminSessionPageQuery }) {
    const locale = useLocale();
    const session = data.currentSession.user?.admin?.session ?? null;
    const events = [...(data.currentSession.user?.admin?.sessionEvents ?? [])].reverse();
    const crumbLabel = session?.user ? userDisplayName(session.user) : adminSessionPageTitle[locale];

    return (
        <AdminPageChrome
            crumbs={[{ label: { de: 'Sitzungen', en: 'Sessions' }[locale], to: '/{-$locale}/admin/sessions' }, { label: crumbLabel }]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminSessionPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{{ de: 'Sitzungsdetails', en: 'Session details' }[locale]}</p>
                </div>

                {session ? (
                    <>
                        <AdminSessionDetailFields session={session} />
                        <section className="grid gap-3">
                            <h2 className="font-serif text-2xl text-foreground">{{ de: 'Ereignisse', en: 'Events' }[locale]}</h2>
                            <AdminSessionEventTimeline
                                events={events}
                                emptyLabel={{ de: 'Keine Ereignisse für diese Sitzung.', en: 'No events for this session.' }[locale]}
                            />
                        </section>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">{{ de: 'Sitzung nicht gefunden.', en: 'Session not found.' }[locale]}</p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminSessionDetailFields({ session }: { session: AdminSessionDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = { de: '-', en: '-' }[locale];

    return (
        <dl className="grid gap-4">
            <DetailField label={{ de: 'Sitzungs-ID', en: 'Session ID' }[locale]} value={session.sessionId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Nutzer', en: 'User' }[locale]}
                </dt>
                <dd className="text-sm text-foreground">
                    {session.user ? (
                        <div className="grid gap-0.5">
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: session.user.userId }}
                                className="font-medium text-foreground hover:underline"
                            >
                                {userDisplayName(session.user)}
                            </Link>
                            <span className="text-muted-foreground">{session.user.emailAddress}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{session.userId ?? { de: 'Anonym', en: 'Anonymous' }[locale]}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <DetailField
                label={{ de: 'Zuletzt aktiv', en: 'Last interaction' }[locale]}
                value={formatDate(session.lastInteractionAt, { locale, timeZone, dateStyle: 'long' })}
            />
            <Separator />
            <DetailField
                label={{ de: 'Erstellt', en: 'Created' }[locale]}
                value={formatDate(session.createdAt, { locale, timeZone, dateStyle: 'long' })}
            />
            <Separator />
            <DetailField
                label={{ de: 'Beendet', en: 'Terminated' }[locale]}
                value={session.wasTerminatedAt ? formatDate(session.wasTerminatedAt, { locale, timeZone, dateStyle: 'long' }) : empty}
            />
            <Separator />
            <DetailField
                label={{ de: 'Verbindung aktiv', en: 'Connection active' }[locale]}
                value={session.connectionActive ? { de: 'Ja', en: 'Yes' }[locale] : { de: 'Nein', en: 'No' }[locale]}
            />
            <Separator />
            <DetailField
                label={{ de: 'Bot', en: 'Bot' }[locale]}
                value={session.isBot ? { de: 'Ja', en: 'Yes' }[locale] : { de: 'Nein', en: 'No' }[locale]}
            />
            <Separator />
            <DetailField label={{ de: 'User-Agent', en: 'User agent' }[locale]} value={session.userAgent ?? empty} />
            <Separator />
            <DetailField label={{ de: 'IP-Hash', en: 'IP hash' }[locale]} value={session.ipHash ?? empty} mono />
            <Separator />
            <DetailField label={{ de: 'Referrer', en: 'Referrer' }[locale]} value={session.referrer ?? empty} />
            <Separator />
            <DetailField label={{ de: 'Einstiegspfad', en: 'Landing path' }[locale]} value={session.landingPath ?? empty} mono />
        </dl>
    );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className={mono ? 'font-mono text-sm break-all text-foreground' : 'text-sm text-foreground'}>{value}</dd>
        </div>
    );
}
