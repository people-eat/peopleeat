import { Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatCurrency, formatDate } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminGiftCardPageQuery, GqlCAdminOutboundEmailPurpose } from '../../graphql/generated';
import { AdminGiftCardPdfsRegenerateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminGiftCardPaymentStatusLabel } from './adminGiftCardsColumns';
import { adminOutboundEmailMetaBadgeClassName, adminOutboundEmailPurposeLabel } from './adminOutboundEmailsColumns';

export function adminGiftCardPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.giftCard.title');
}
export function adminGiftCardPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.giftCard.description');
}

type AdminGiftCardDetail = NonNullable<NonNullable<NonNullable<GqlCAdminGiftCardPageQuery['currentSession']['user']>['admin']>['giftCard']>;

type AdminGiftCardOutboundEmail = NonNullable<
    NonNullable<NonNullable<GqlCAdminGiftCardPageQuery['currentSession']['user']>['admin']>['outboundEmails']
>[number];

const ADMIN_GIFT_CARD_EMAIL_PURPOSES: GqlCAdminOutboundEmailPurpose[] = ['GIFT_CARD_PURCHASED', 'AUTH_EMAIL_OTP'];

export function adminGiftCardPageVariables(giftCardId: string) {
    return {
        giftCardId,
        emailsCriterion: {
            skip: 0,
            take: 50,
            purposes: ADMIN_GIFT_CARD_EMAIL_PURPOSES,
            relatedEntityType: 'GIFT_CARD' as const,
            relatedEntityId: giftCardId,
        },
    };
}

export function AdminGiftCardPage({ data }: { data: GqlCAdminGiftCardPageQuery }) {
    const locale = useLocale();
    const admin = data.currentSession.user?.admin;
    const giftCard = admin?.giftCard ?? null;
    const outboundEmails = admin?.outboundEmails ?? [];
    const crumbLabel = giftCard?.redeemCode.trim() || adminGiftCardPageTitle(locale);

    return (
        <AdminPageChrome
            crumbs={[{ label: t(locale, 'admin', 'copy.voucherPurchases'), to: '/{-$locale}/admin/gift-cards' }, { label: crumbLabel }]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminGiftCardPageTitle(locale)}</h1>
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.giftCardDetails')}</p>
                </div>

                {giftCard ? (
                    <>
                        <AdminGiftCardDetailFields giftCard={giftCard} />
                        <AdminGiftCardEmailsSection emails={outboundEmails} />
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.giftCardNotFound')}</p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminGiftCardDetailFields({ giftCard }: { giftCard: AdminGiftCardDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const [, regeneratePdfs] = useMutation(AdminGiftCardPdfsRegenerateDocument);
    const [regenerating, setRegenerating] = useState(false);
    const empty = t(locale, 'admin', 'copy.empty');
    const address = giftCard.invoiceAddress;
    const paid = giftCard.paymentStatus === 'PAYED';

    async function onRegeneratePdfs() {
        setRegenerating(true);
        try {
            const result = await regeneratePdfs({ giftCardId: giftCard.giftCardId });
            if (result.error || !result.data?.admin.giftCardPdfsRegenerate.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotGeneratePdfs'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.pdfsUpdated'));
            await router.invalidate();
        } finally {
            setRegenerating(false);
        }
    }

    return (
        <dl className="grid gap-4">
            <DetailField label={t(locale, 'admin', 'copy.giftCardId')} value={giftCard.giftCardId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.status')}</dt>
                <dd>
                    <Badge variant={giftCard.paymentStatus === 'PAYED' ? 'default' : 'secondary'}>
                        {adminGiftCardPaymentStatusLabel(giftCard.paymentStatus, locale)}
                    </Badge>
                </dd>
            </div>
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.amount3')} value={formatCurrency(giftCard.originalBalanceCents, { locale })} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.balance')} value={formatCurrency(giftCard.balanceCents, { locale })} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.code')} value={giftCard.redeemCode} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.buyer')}</dt>
                <dd className="text-sm text-foreground">
                    <div className="grid gap-0.5">
                        <span>{giftCard.buyerEmail}</span>
                        {giftCard.buyerUserId ? (
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: giftCard.buyerUserId }}
                                className="font-mono text-xs break-all text-muted-foreground hover:underline"
                            >
                                {giftCard.buyerUserId}
                            </Link>
                        ) : null}
                    </div>
                </dd>
            </div>
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.recipient')} value={giftCard.recipientName} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.occasion')} value={giftCard.occasion} />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.message')} value={giftCard.message || empty} />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t(locale, 'admin', 'copy.invoiceAddress')}
                </dt>
                <dd className="text-sm text-foreground">
                    {address ? (
                        <div className="grid gap-0.5">
                            {address.companyName ? <span>{address.companyName}</span> : null}
                            <span>
                                {address.firstName} {address.lastName}
                            </span>
                            <span>{address.line1}</span>
                            {address.line2 ? <span>{address.line2}</span> : null}
                            <span>
                                {address.postalCode} {address.city}
                            </span>
                            <span>{address.country}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t(locale, 'admin', 'copy.purchaseReceipt')}
                </dt>
                <dd className="text-sm text-foreground">
                    {giftCard.invoiceFileUpload ? (
                        <a
                            href={giftCard.invoiceFileUpload.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-foreground hover:underline"
                        >
                            {giftCard.invoiceFileUpload.filename}
                        </a>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t(locale, 'admin', 'copy.giftCardPdf')}
                </dt>
                <dd className="text-sm text-foreground">
                    {giftCard.voucherFileUpload ? (
                        <a
                            href={giftCard.voucherFileUpload.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-foreground hover:underline"
                        >
                            {giftCard.voucherFileUpload.filename}
                        </a>
                    ) : (
                        <span className="text-muted-foreground">{empty}</span>
                    )}
                </dd>
            </div>
            {paid ? (
                <>
                    <Separator />
                    <div className="grid gap-2">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {t(locale, 'admin', 'copy.pdfs')}
                        </dt>
                        <dd>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={regenerating}
                                onClick={() => void onRegeneratePdfs()}
                            >
                                {regenerating ? t(locale, 'admin', 'copy.generating') : t(locale, 'admin', 'copy.regeneratePdfs')}
                            </Button>
                        </dd>
                    </div>
                </>
            ) : null}
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.created')}
                value={formatDate(giftCard.createdAt, { locale, timeZone, dateStyle: 'long' })}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.expires2')}
                value={formatDate(giftCard.expiresAt, { locale, timeZone, dateStyle: 'long' })}
            />
        </dl>
    );
}

function AdminGiftCardEmailsSection({ emails }: { emails: AdminGiftCardOutboundEmail[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <section className="grid gap-4">
            <h2 className="font-serif text-2xl/tight text-foreground">{t(locale, 'admin', 'copy.emails')}</h2>
            {emails.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noRelatedEmails')}</p>
            ) : (
                <ul className="grid gap-3">
                    {emails.map((email) => (
                        <li key={email.outboundEmailId} className="grid gap-1 border-b border-border/60 pb-3 last:border-b-0">
                            <Link
                                to="/{-$locale}/admin/outbound-emails/$outboundEmailId"
                                params={{ outboundEmailId: email.outboundEmailId }}
                                className="font-medium text-foreground hover:underline"
                            >
                                {email.subject || email.outboundEmailId}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className={adminOutboundEmailMetaBadgeClassName}>
                                    {adminOutboundEmailPurposeLabel(email.purpose, locale)}
                                </Badge>
                                <span>{email.toEmail}</span>
                                <span className="tabular-nums">
                                    {formatDate(email.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
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
