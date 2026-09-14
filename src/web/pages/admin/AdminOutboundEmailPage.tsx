import { Link } from '@tanstack/react-router';

import { formatDateTime, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminOutboundEmailPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminOutboundEmailPurposeLabel } from './adminOutboundEmailsColumns';

export const adminOutboundEmailPageTitle = { de: 'E-Mail', en: 'Email' } as const;
export const adminOutboundEmailPageDescription = {
    de: 'Details einer ausgehenden Transaktions-E-Mail.',
    en: 'Details for an outbound transactional email.',
} as const;

type AdminOutboundEmailDetail = NonNullable<
    NonNullable<NonNullable<GqlCAdminOutboundEmailPageQuery['currentSession']['user']>['admin']>['outboundEmail']
>;

export function AdminOutboundEmailPage({ data }: { data: GqlCAdminOutboundEmailPageQuery }) {
    const locale = useLocale();
    const email = data.currentSession.user?.admin?.outboundEmail ?? null;
    const crumbLabel = email?.subject.trim() || adminOutboundEmailPageTitle[locale];

    return (
        <AdminPageChrome
            crumbs={[{ label: { de: 'E-Mails', en: 'Emails' }[locale], to: '/{-$locale}/admin/outbound-emails' }, { label: crumbLabel }]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminOutboundEmailPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{{ de: 'E-Mail-Details', en: 'Email details' }[locale]}</p>
                </div>

                {email ? (
                    <AdminOutboundEmailDetailFields email={email} />
                ) : (
                    <p className="text-sm text-muted-foreground">{{ de: 'E-Mail nicht gefunden.', en: 'Email not found.' }[locale]}</p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminOutboundEmailDetailFields({ email }: { email: AdminOutboundEmailDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = { de: '—', en: '—' }[locale];

    return (
        <dl className="grid gap-4">
            <DetailField label={{ de: 'E-Mail-ID', en: 'Email ID' }[locale]} value={email.outboundEmailId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Zweck', en: 'Purpose' }[locale]}
                </dt>
                <dd>
                    <Badge variant="secondary">{adminOutboundEmailPurposeLabel(email.purpose, locale)}</Badge>
                </dd>
            </div>
            <Separator />
            <DetailField label={{ de: 'An', en: 'To' }[locale]} value={email.toEmail} />
            <Separator />
            <DetailField label={{ de: 'Von', en: 'From' }[locale]} value={email.fromEmail ?? empty} />
            <Separator />
            <DetailField label={{ de: 'Betreff', en: 'Subject' }[locale]} value={email.subject} />
            <Separator />
            <DetailField label={{ de: 'Sprache', en: 'Locale' }[locale]} value={email.locale} />
            <Separator />
            <DetailField label={{ de: 'Anbieter', en: 'Provider' }[locale]} value={email.provider} />
            <Separator />
            <DetailField
                label={{ de: 'Anbieter-Nachrichten-ID', en: 'Provider message ID' }[locale]}
                value={email.providerMessageId ?? empty}
                mono
            />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Nutzer', en: 'User' }[locale]}
                </dt>
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
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Bezug', en: 'Related' }[locale]}
                </dt>
                <dd className="text-sm text-foreground">
                    {email.relatedEntityType === 'GIFT_CARD' && email.relatedEntityId ? (
                        <Link
                            to="/{-$locale}/admin/gift-cards/$giftCardId"
                            params={{ giftCardId: email.relatedEntityId }}
                            className="font-medium text-foreground hover:underline"
                        >
                            {{ de: 'Gutschein', en: 'Gift card' }[locale]} · {email.relatedEntityId}
                        </Link>
                    ) : email.relatedEntityId ? (
                        <span className="font-mono text-xs break-all text-muted-foreground">{email.relatedEntityId}</span>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <DetailField label={{ de: 'Fehlergrund', en: 'Failure reason' }[locale]} value={email.failureReason ?? empty} />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Anhänge', en: 'Attachments' }[locale]}
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
                label={{ de: 'Erstellt', en: 'Created' }[locale]}
                value={formatOutboundEmailTimestamp(email.createdAt, locale, timeZone)}
            />
            <Separator />
            <DetailField
                label={{ de: 'Gesendet', en: 'Sent' }[locale]}
                value={formatOutboundEmailTimestamp(email.sentAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={{ de: 'Fehlgeschlagen', en: 'Failed' }[locale]}
                value={formatOutboundEmailTimestamp(email.failedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={{ de: 'Zugestellt', en: 'Delivered' }[locale]}
                value={formatOutboundEmailTimestamp(email.deliveredAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={{ de: 'Zustellung verzögert', en: 'Delivery delayed' }[locale]}
                value={formatOutboundEmailTimestamp(email.deliveryDelayedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={{ de: 'Geöffnet', en: 'Opened' }[locale]}
                value={formatOutboundEmailTimestamp(email.openedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={{ de: 'Geklickt', en: 'Clicked' }[locale]}
                value={formatOutboundEmailTimestamp(email.clickedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={{ de: 'Bounce', en: 'Bounced' }[locale]}
                value={formatOutboundEmailTimestamp(email.bouncedAt, locale, timeZone, empty)}
            />
            <Separator />
            <DetailField
                label={{ de: 'Beschwerde', en: 'Complained' }[locale]}
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
