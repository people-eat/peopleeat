import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { formatDateTime, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminOutboundEmailPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminOutboundEmailMetaBadgeClassName, adminOutboundEmailPurposeLabel } from './adminOutboundEmailsColumns';

export function adminOutboundEmailPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.outboundEmail.title');
}
export function adminOutboundEmailPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.outboundEmail.description');
}

type AdminOutboundEmailDetail = NonNullable<
    NonNullable<NonNullable<GqlCAdminOutboundEmailPageQuery['currentSession']['user']>['admin']>['outboundEmail']
>;

export function AdminOutboundEmailPage({ data }: { data: GqlCAdminOutboundEmailPageQuery }) {
    const locale = useLocale();
    const email = data.currentSession.user?.admin?.outboundEmail ?? null;
    const crumbLabel = email?.subject.trim() || adminOutboundEmailPageTitle(locale);

    return (
        <AdminPageChrome
            crumbs={[{ label: t(locale, 'admin', 'copy.emails'), to: '/{-$locale}/admin/outbound-emails' }, { label: crumbLabel }]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminOutboundEmailPageTitle(locale)}</h1>
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.emailDetails')}</p>
                </div>

                {email ? (
                    <AdminOutboundEmailDetailFields email={email} />
                ) : (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.emailNotFound')}</p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminOutboundEmailDetailFields({ email }: { email: AdminOutboundEmailDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = t(locale, 'admin', 'copy.empty');

    return (
        <dl className="grid gap-4">
            <DetailField label={t(locale, 'admin', 'copy.emailId')} value={email.outboundEmailId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.purpose')}</dt>
                <dd>
                    <Badge variant="outline" className={adminOutboundEmailMetaBadgeClassName}>
                        {adminOutboundEmailPurposeLabel(email.purpose, locale)}
                    </Badge>
                </dd>
            </div>
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.to')} value={email.toEmail} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.from')} value={email.fromEmail ?? empty} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.subject')} value={email.subject} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.locale')} value={email.locale} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.provider')} value={email.provider} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.providerMessageId')} value={email.providerMessageId ?? empty} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.user')}</dt>
                <dd className="text-sm text-foreground">
                    {email.user ? (
                        <div className="grid gap-0.5">
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: email.user.userId }}
                                className="font-medium text-foreground hover:underline"
                            >
                                {userDisplayName(email.user)}
                            </Link>
                            <span className="text-muted-foreground">{email.user.emailAddress}</span>
                        </div>
                    ) : email.userId ? (
                        <Link
                            to="/{-$locale}/admin/users/$userId"
                            params={{ userId: email.userId }}
                            className="font-mono text-xs break-all text-foreground hover:underline"
                        >
                            {email.userId}
                        </Link>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.related')}</dt>
                <dd className="text-sm text-foreground">
                    {email.relatedEntityType === 'GIFT_CARD' && email.relatedEntityId ? (
                        <Link
                            to="/{-$locale}/admin/gift-cards/$giftCardId"
                            params={{ giftCardId: email.relatedEntityId }}
                            className="font-medium text-foreground hover:underline"
                        >
                            {t(locale, 'admin', 'copy.giftCard2')} · {email.relatedEntityId}
                        </Link>
                    ) : email.relatedEntityId ? (
                        <span className="font-mono text-xs break-all text-muted-foreground">{email.relatedEntityId}</span>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.failureReason')} value={email.failureReason ?? empty} />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t(locale, 'admin', 'copy.attachments')}
                </dt>
                <dd className="text-sm text-foreground">
                    {email.attachments.length === 0 ? (
                        <span className="text-muted-foreground">{empty}</span>
                    ) : (
                        <ul className="grid gap-1">
                            {email.attachments.map((attachment) => (
                                <li key={attachment.fileUploadId}>
                                    <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-medium text-foreground hover:underline"
                                    >
                                        {attachment.filename}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </dd>
            </div>
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.created')}
                value={formatOutboundEmailTimestamp(email.createdAt, locale, timeZone)}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.sent')}
                value={formatOutboundEmailTimestamp(email.sentAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.failed')}
                value={formatOutboundEmailTimestamp(email.failedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.delivered')}
                value={formatOutboundEmailTimestamp(email.deliveredAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.deliveryDelayed')}
                value={formatOutboundEmailTimestamp(email.deliveryDelayedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.opened')}
                value={formatOutboundEmailTimestamp(email.openedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.clicked')}
                value={formatOutboundEmailTimestamp(email.clickedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.bounced')}
                value={formatOutboundEmailTimestamp(email.bouncedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.complained')}
                value={formatOutboundEmailTimestamp(email.complainedAt, locale, timeZone, empty)}
            />
        </dl>
    );
}

function formatOutboundEmailTimestamp(
    value: string | null | undefined,
    locale: ReturnType<typeof useLocale>,
    timeZone: string,
    empty?: string,
) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'long', timeStyle: 'medium', nullAs: empty ?? '—' });
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className={mono ? 'font-mono text-sm break-all text-foreground' : 'text-sm text-foreground'}>{value}</dd>
        </div>
    );
}
