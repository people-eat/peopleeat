import { Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatCurrency, formatDate } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Separator } from '../../components/base/separator';
import type { GqlCAdminGiftCardPageQuery, GqlCAdminOutboundEmailPurpose } from '../../graphql/generated';
import { AdminGiftCardPdfsRegenerateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminGiftCardPaymentStatusLabel } from './adminGiftCardsColumns';
import { adminOutboundEmailPurposeLabel } from './adminOutboundEmailsColumns';

export const adminGiftCardPageTitle = { de: 'Gutschein', en: 'Gift card' } as const;
export const adminGiftCardPageDescription = {
    de: 'Details eines Gutscheinkaufs.',
    en: 'Details for a gift card purchase.',
} as const;

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
    const crumbLabel = giftCard?.redeemCode.trim() || adminGiftCardPageTitle[locale];

    return (
        <AdminPageChrome
            crumbs={[
                { label: { de: 'Gutscheinverkäufe', en: 'Voucher Purchases' }[locale], to: '/{-$locale}/admin/gift-cards' },
                { label: crumbLabel },
            ]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminGiftCardPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{{ de: 'Gutscheindetails', en: 'Gift card details' }[locale]}</p>
                </div>

                {giftCard ? (
                    <>
                        <AdminGiftCardDetailFields giftCard={giftCard} />
                        <AdminGiftCardEmailsSection emails={outboundEmails} />
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Gutschein nicht gefunden.', en: 'Gift card not found.' }[locale]}
                    </p>
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
    const empty = { de: '—', en: '—' }[locale];
    const address = giftCard.invoiceAddress;
    const paid = giftCard.paymentStatus === 'PAYED';

    async function onRegeneratePdfs() {
        setRegenerating(true);
        try {
            const result = await regeneratePdfs({ giftCardId: giftCard.giftCardId });
            if (result.error || !result.data?.admin.giftCardPdfsRegenerate.success) {
                toast.error({ de: 'PDFs konnten nicht erzeugt werden.', en: 'Could not generate PDFs.' }[locale]);
                return;
            }
            toast.success({ de: 'PDFs aktualisiert.', en: 'PDFs updated.' }[locale]);
            await router.invalidate();
        } finally {
            setRegenerating(false);
        }
    }

    return (
        <dl className="grid gap-4">
            <DetailField label={{ de: 'Gutschein-ID', en: 'Gift card ID' }[locale]} value={giftCard.giftCardId} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Status', en: 'Status' }[locale]}
                </dt>
                <dd>
                    <Badge variant={giftCard.paymentStatus === 'PAYED' ? 'default' : 'secondary'}>
                        {adminGiftCardPaymentStatusLabel(giftCard.paymentStatus, locale)}
                    </Badge>
                </dd>
            </div>
            <Separator />
            <DetailField label={{ de: 'Betrag', en: 'Amount' }[locale]} value={formatCurrency(giftCard.originalBalanceCents, { locale })} />
            <Separator />
            <DetailField label={{ de: 'Restguthaben', en: 'Balance' }[locale]} value={formatCurrency(giftCard.balanceCents, { locale })} />
            <Separator />
            <DetailField label={{ de: 'Code', en: 'Code' }[locale]} value={giftCard.redeemCode} mono />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Käufer', en: 'Buyer' }[locale]}
                </dt>
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
            <DetailField label={{ de: 'Empfänger', en: 'Recipient' }[locale]} value={giftCard.recipientName} />
            <Separator />
            <DetailField label={{ de: 'Anlass', en: 'Occasion' }[locale]} value={giftCard.occasion} />
            <Separator />
            <DetailField label={{ de: 'Nachricht', en: 'Message' }[locale]} value={giftCard.message || empty} />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Rechnungsadresse', en: 'Invoice address' }[locale]}
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
                    {{ de: 'Kaufbeleg', en: 'Purchase receipt' }[locale]}
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
                    {{ de: 'Gutschein-PDF', en: 'Gift card PDF' }[locale]}
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
                            {{ de: 'PDFs', en: 'PDFs' }[locale]}
                        </dt>
                        <dd>
                            <Button type="button" variant="outline" size="sm" disabled={regenerating} onClick={() => void onRegeneratePdfs()}>
                                {
                                    {
                                        de: regenerating ? 'Wird erzeugt…' : 'PDFs neu erzeugen',
                                        en: regenerating ? 'Generating…' : 'Regenerate PDFs',
                                    }[locale]
                                }
                            </Button>
                        </dd>
                    </div>
                </>
            ) : null}
            <Separator />
            <DetailField
                label={{ de: 'Erstellt', en: 'Created' }[locale]}
                value={formatDate(giftCard.createdAt, { locale, timeZone, dateStyle: 'long' })}
            />
            <Separator />
            <DetailField
                label={{ de: 'Gültig bis', en: 'Expires' }[locale]}
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
            <h2 className="font-serif text-2xl/tight text-foreground">{{ de: 'E-Mails', en: 'Emails' }[locale]}</h2>
            {emails.length === 0 ? (
                <p className="text-sm text-muted-foreground">{{ de: 'Keine zugehörigen E-Mails.', en: 'No related emails.' }[locale]}</p>
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
                                <Badge variant="secondary">{adminOutboundEmailPurposeLabel(email.purpose, locale)}</Badge>
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
