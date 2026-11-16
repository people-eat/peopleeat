import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { formatDateTime, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminLogPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminLogLevelBadgeClassName, adminLogLevelLabel } from './adminLogsColumns';

export function adminLogPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.log.title');
}
export function adminLogPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.log.description');
}

type AdminLogDetail = NonNullable<NonNullable<NonNullable<GqlCAdminLogPageQuery['currentSession']['user']>['admin']>['log']>;

export function AdminLogPage({ data }: { data: GqlCAdminLogPageQuery }) {
    const locale = useLocale();
    const log = data.currentSession.user?.admin?.log ?? null;
    const crumbLabel = log?.message ? (log.message.length > 48 ? `${log.message.slice(0, 48)}…` : log.message) : adminLogPageTitle(locale);

    return (
        <AdminPageChrome crumbs={[{ label: t(locale, 'admin', 'copy.logMessages'), to: '/{-$locale}/admin/logs' }, { label: crumbLabel }]}>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminLogPageTitle(locale)}</h1>
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.logDetails')}</p>
                </div>

                {log ? (
                    <AdminLogDetailFields log={log} />
                ) : (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.logMessageNotFound')}</p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminLogDetailFields({ log }: { log: AdminLogDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = t(locale, 'admin', 'copy.empty');
    const contextText = formatLogContext(log.context, empty);

    return (
        <dl className="grid gap-4">
            <DetailField label={t(locale, 'admin', 'copy.logId')} value={log.logId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.level')}</dt>
                <dd>
                    <Badge variant="outline" className={adminLogLevelBadgeClassName(log.level)}>
                        {adminLogLevelLabel(log.level, locale)}
                    </Badge>
                </dd>
            </div>
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.time2')} value={formatLogCreatedAt(log.createdAt, locale, timeZone)} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.message')} value={log.message} />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.user')}</dt>
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
                        <span className="text-muted-foreground">{t(locale, 'admin', 'copy.anonymous')}</span>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.session')}</dt>
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
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.context')}</dt>
                <dd>
                    <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap text-foreground">
                        {contextText}
                    </pre>
                </dd>
            </div>
        </dl>
    );
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
