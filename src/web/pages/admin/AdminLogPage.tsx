import { Link } from '@tanstack/react-router';

import { formatDateTime, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminLogLevel, GqlCAdminLogPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminLogLevelLabel } from './adminLogsColumns';

export const adminLogPageTitle = { de: 'Log', en: 'Log' } as const;
export const adminLogPageDescription = {
    de: 'Details einer Log-Nachricht.',
    en: 'Details for a log message.',
} as const;

type AdminLogDetail = NonNullable<NonNullable<NonNullable<GqlCAdminLogPageQuery['currentSession']['user']>['admin']>['log']>;

export function AdminLogPage({ data }: { data: GqlCAdminLogPageQuery }) {
    const locale = useLocale();
    const log = data.currentSession.user?.admin?.log ?? null;
    const crumbLabel = log?.message ? (log.message.length > 48 ? `${log.message.slice(0, 48)}…` : log.message) : adminLogPageTitle[locale];

    return (
        <AdminPageChrome
            crumbs={[{ label: { de: 'Log Nachrichten', en: 'Log Messages' }[locale], to: '/{-$locale}/admin/logs' }, { label: crumbLabel }]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminLogPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{{ de: 'Log-Details', en: 'Log details' }[locale]}</p>
                </div>

                {log ? (
                    <AdminLogDetailFields log={log} />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Log-Nachricht nicht gefunden.', en: 'Log message not found.' }[locale]}
                    </p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminLogDetailFields({ log }: { log: AdminLogDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = { de: '—', en: '—' }[locale];
    const contextText = formatLogContext(log.context, empty);

    return (
        <dl className="grid gap-4">
            <DetailField label={{ de: 'Log-ID', en: 'Log ID' }[locale]} value={log.logId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Level', en: 'Level' }[locale]}
                </dt>
                <dd>
                    <Badge variant={adminLogLevelBadgeVariant(log.level)}>{adminLogLevelLabel(log.level, locale)}</Badge>
                </dd>
            </div>
            <Separator />
            <DetailField label={{ de: 'Zeit', en: 'Time' }[locale]} value={formatLogCreatedAt(log.createdAt, locale, timeZone)} />
            <Separator />
            <DetailField label={{ de: 'Nachricht', en: 'Message' }[locale]} value={log.message} />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Nutzer', en: 'User' }[locale]}
                </dt>
                <dd className="text-sm text-foreground">
                    {log.session?.user ? (
                        <div className="grid gap-0.5">
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: log.session.user.userId }}
                                className="font-medium text-foreground hover:underline"
                            >
                                {userDisplayName(log.session.user)}
                            </Link>
                            <span className="text-muted-foreground">{log.session.user.emailAddress}</span>
                        </div>
                    ) : log.sessionId ? (
                        <span className="text-muted-foreground">{{ de: 'Anonym', en: 'Anonymous' }[locale]}</span>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Sitzung', en: 'Session' }[locale]}
                </dt>
                <dd className="text-sm text-foreground">
                    {log.sessionId ? (
                        <Link
                            to="/{-$locale}/admin/sessions/$sessionId"
                            params={{ sessionId: log.sessionId }}
                            className="font-mono text-xs break-all text-foreground hover:underline"
                        >
                            {log.sessionId}
                        </Link>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Kontext', en: 'Context' }[locale]}
                </dt>
                <dd>
                    <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap text-foreground">
                        {contextText}
                    </pre>
                </dd>
            </div>
        </dl>
    );
}

function adminLogLevelBadgeVariant(level: GqlCAdminLogLevel): 'destructive' | 'outline' | 'secondary' {
    switch (level) {
        case 'error':
            return 'destructive';
        case 'warn':
            return 'outline';
        default:
            return 'secondary';
    }
}

function formatLogCreatedAt(value: string, locale: ReturnType<typeof useLocale>, timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'long', timeStyle: 'medium' });
}

function formatLogContext(context: unknown, empty: string) {
    if (context == null) return empty;
    if (typeof context === 'string') return context;
    try {
        return JSON.stringify(context, null, 2);
    } catch {
        return empty;
    }
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className={mono ? 'font-mono text-sm break-all text-foreground' : 'text-sm text-foreground'}>{value}</dd>
        </div>
    );
}
