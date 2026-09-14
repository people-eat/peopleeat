import { Link } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, FileTextIcon, GiftIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { formatCurrency, formatDate } from '../../shared';
import { useLocale } from '../hooks/useLocale';
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
    const timeZone = useTimeZone();
    const [copied, setCopied] = useState(false);
    const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const paid = giftCard.paymentStatus === 'PAYED';
    const prepared = giftCard.paymentStatus === 'PREPARED';
    const amount = formatCurrency(giftCard.originalBalanceCents, { locale });
    const createdLabel = formatDate(giftCard.createdAt, { locale, timeZone, dateStyle: 'medium' });
    const expiresLabel = formatDate(giftCard.expiresAt, { locale, timeZone, dateStyle: 'long' });
    const message = giftCard.message.trim();
    const statusLabel =
        {
            PAYED: { de: 'Bezahlt', en: 'Paid' },
            PREPARED: { de: 'Offen', en: 'Open' },
        }[giftCard.paymentStatus as 'PAYED' | 'PREPARED']?.[locale] ?? giftCard.paymentStatus;
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
            toast.success({ de: 'Einlöscode kopiert', en: 'Redeem code copied' }[locale]);
            setCopied(true);
            if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
            copiedResetRef.current = setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error({ de: 'Kopieren fehlgeschlagen', en: 'Could not copy' }[locale]);
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
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{{ de: 'Für', en: 'For' }[locale]}</p>
                <p className="font-serif text-xl tracking-tight">{giftCard.recipientName}</p>
                {message.length > 0 ? (
                    <p className="mx-auto line-clamp-3 max-w-sm whitespace-pre-wrap text-sm text-muted-foreground">{message}</p>
                ) : null}
            </div>

            {paid && giftCard.redeemCode ? (
                <div className="grid gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Einlöscode', en: 'Redeem code' }[locale]}
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => void copyRedeemCode()}
                            aria-label={{ de: 'Einlöscode kopieren', en: 'Copy redeem code' }[locale]}
                        >
                            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                            {{ de: 'Kopieren', en: 'Copy' }[locale]}
                        </Button>
                    </div>
                    <p className="font-mono text-lg tracking-wider">{giftCard.redeemCode}</p>
                    <p className="text-xs text-muted-foreground">
                        {{ de: `Gültig bis ${expiresLabel}`, en: `Valid until ${expiresLabel}` }[locale]}
                    </p>
                </div>
            ) : null}

            {prepared ? (
                <div className="mt-auto grid gap-3">
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Die Zahlung ist noch offen. Schließe den Kauf ab, um den Einlöscode und die PDFs zu erhalten.',
                                en: 'Payment is still open. Finish checkout to get the redeem code and PDFs.',
                            }[locale]
                        }
                    </p>
                    <Button asChild className="w-full sm:w-fit">
                        <Link to="/{-$locale}/gift-card/$giftCardId/checkout" params={{ giftCardId: giftCard.giftCardId }}>
                            {{ de: 'Zahlung fortsetzen', en: 'Continue checkout' }[locale]}
                        </Link>
                    </Button>
                </div>
            ) : null}

            {paid && (giftCard.voucherFileUpload || giftCard.invoiceFileUpload) ? (
                <div className="mt-auto flex flex-wrap gap-2">
                    {giftCard.voucherFileUpload ? (
                        <Button asChild variant="outline" size="sm">
                            <a href={giftCard.voucherFileUpload.url} target="_blank" rel="noreferrer">
                                <GiftIcon aria-hidden />
                                {{ de: 'Gutschein-PDF', en: 'Gift card PDF' }[locale]}
                            </a>
                        </Button>
                    ) : null}
                    {giftCard.invoiceFileUpload ? (
                        <Button asChild variant="outline" size="sm">
                            <a href={giftCard.invoiceFileUpload.url} target="_blank" rel="noreferrer">
                                <FileTextIcon aria-hidden />
                                {{ de: 'Kaufbeleg', en: 'Receipt' }[locale]}
                            </a>
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
}
