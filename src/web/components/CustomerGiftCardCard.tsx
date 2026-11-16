import { Link } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, FileTextIcon, GiftIcon, RefreshCwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatCurrency, formatDate } from '../../shared';
import { ProfileGiftCardPdfsRegenerateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { Button } from './base/button';
import { StatusBadge } from './base/status-badge';

export type CustomerGiftCardCardGiftCard = {
    giftCardId: string;
    occasion: string;
    recipientName: string;
    message: string;
    originalBalanceCents: number;
    redeemCode: string | null;
    paymentStatus: 'PREPARED' | 'PAYED' | string;
    invoiceFileUpload: { url: string } | null;
    voucherFileUpload: { url: string } | null;
    expiresAt: string;
    createdAt: string;
};

export function CustomerGiftCardCard({ giftCard, className }: { giftCard: CustomerGiftCardCardGiftCard; className?: string }) {
    const locale = useLocale();
    const { t } = useT('common');
    const timeZone = useTimeZone();
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [, regeneratePdfs] = useMutation(ProfileGiftCardPdfsRegenerateDocument);
    const paid = giftCard.paymentStatus === 'PAYED';
    const prepared = giftCard.paymentStatus === 'PREPARED';
    const amount = formatCurrency(giftCard.originalBalanceCents, { locale });
    const createdLabel = formatDate(giftCard.createdAt, { locale, timeZone, dateStyle: 'medium' });
    const expiresLabel = formatDate(giftCard.expiresAt, { locale, timeZone, dateStyle: 'long' });
    const message = giftCard.message.trim();
    const missingPdf = paid && (!giftCard.voucherFileUpload || !giftCard.invoiceFileUpload);
    const statusLabel =
        giftCard.paymentStatus === 'PAYED'
            ? t('giftCardCard.statusPayed')
            : giftCard.paymentStatus === 'PREPARED'
              ? t('giftCardCard.statusPrepared')
              : giftCard.paymentStatus;
    const statusTone = paid ? 'success' : prepared ? 'warning' : 'info';

    useEffect(() => {
        return () => {
            if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
        };
    }, []);

    async function copyRedeemCode() {
        if (giftCard.redeemCode == null) return;
        try {
            await navigator.clipboard.writeText(giftCard.redeemCode);
            toast.success(t('giftCardCard.codeCopied'));
            setCopied(true);
            if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
            copiedResetRef.current = setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error(t('giftCardCard.copyFailed'));
        }
    }

    async function onRegeneratePdfs() {
        setRegenerating(true);
        try {
            const result = await regeneratePdfs({ giftCardId: giftCard.giftCardId });
            if (result.error || !result.data?.user.giftCardPdfsRegenerate.success) {
                toast.error(t('giftCardCard.pdfFailed'));
                return;
            }
            toast.success(t('giftCardCard.pdfUpdated'));
        } finally {
            setRegenerating(false);
        }
    }

    return (
        <article
            className={cn(
                'relative flex h-full min-w-0 flex-col gap-5 overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm',
                prepared && 'border-yellow-400/70',
                className,
            )}
        >
            <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
                <p className="text-xs text-muted-foreground">{createdLabel}</p>
            </div>

            <div className="grid gap-1 text-center">
                <div className="mx-auto mb-1 flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <GiftIcon className="size-5" aria-hidden />
                </div>
                <p className="font-serif text-3xl tracking-tight">{amount}</p>
                <p className="text-sm text-muted-foreground">{giftCard.occasion}</p>
            </div>

            <div className="grid gap-1 border-t border-border pt-4 text-center">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('giftCardCard.for')}</p>
                <p className="font-serif text-xl tracking-tight">{giftCard.recipientName}</p>
                {message.length > 0 ? (
                    <p className="mx-auto line-clamp-3 max-w-sm whitespace-pre-wrap text-sm text-muted-foreground">{message}</p>
                ) : null}
            </div>

            {paid && giftCard.redeemCode ? (
                <div className="grid gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('giftCardCard.redeemCode')}</p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => void copyRedeemCode()}
                            aria-label={t('giftCardCard.copyCodeAria')}
                        >
                            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                            {t('giftCardCard.copy')}
                        </Button>
                    </div>
                    <p className="font-mono text-lg tracking-wider">{giftCard.redeemCode}</p>
                    <p className="text-xs text-muted-foreground">{t('giftCardCard.validUntil', { date: expiresLabel })}</p>
                </div>
            ) : null}

            {prepared ? (
                <div className="mt-auto grid gap-3">
                    <p className="text-sm text-muted-foreground">{t('giftCardCard.paymentPending')}</p>
                    <Button asChild className="w-full sm:w-fit">
                        <Link to="/{-$locale}/gift-card/$giftCardId/checkout" params={{ giftCardId: giftCard.giftCardId }}>
                            {t('giftCardCard.continueCheckout')}
                        </Link>
                    </Button>
                </div>
            ) : null}

            {paid ? (
                <div className="mt-auto flex flex-wrap gap-2">
                    {giftCard.voucherFileUpload ? (
                        <Button asChild variant="outline" size="sm">
                            <a href={giftCard.voucherFileUpload.url} target="_blank" rel="noreferrer">
                                <GiftIcon aria-hidden />
                                {t('giftCardCard.giftPdf')}
                            </a>
                        </Button>
                    ) : null}
                    {giftCard.invoiceFileUpload ? (
                        <Button asChild variant="outline" size="sm">
                            <a href={giftCard.invoiceFileUpload.url} target="_blank" rel="noreferrer">
                                <FileTextIcon aria-hidden />
                                {t('giftCardCard.receipt')}
                            </a>
                        </Button>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" disabled={regenerating} onClick={() => void onRegeneratePdfs()}>
                        <RefreshCwIcon aria-hidden className={regenerating ? 'animate-spin' : undefined} />
                        {regenerating
                            ? t('giftCardCard.pdfGenerating')
                            : missingPdf
                              ? t('giftCardCard.pdfGenerate')
                              : t('giftCardCard.pdfRegenerate')}
                    </Button>
                </div>
            ) : null}
        </article>
    );
}
