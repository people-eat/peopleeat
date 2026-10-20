import { Link } from '@tanstack/react-router';

import { formatCurrency, formatDate } from '../../shared';
import type { GqlCGiftCardPaymentStatus } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { adminGiftCardPaymentStatusLabel } from '../pages/admin/adminGiftCardsColumns';
import { cn } from '../utils/cn';
import { Badge } from './base/badge';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';

export type AdminGiftCardListCardGiftCard = {
    giftCardId: string;
    buyerEmail: string;
    occasion: string;
    recipientName: string;
    originalBalanceCents: number;
    balanceCents: number;
    redeemCode: string;
    paymentStatus: GqlCGiftCardPaymentStatus | string;
    expiresAt: string;
    createdAt: string;
};

export function AdminGiftCardListCard({ giftCard }: { giftCard: AdminGiftCardListCardGiftCard }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const paymentStatus = giftCard.paymentStatus as GqlCGiftCardPaymentStatus;
    const amountLabel = formatCurrency(giftCard.originalBalanceCents, { locale });
    const createdLabel = formatDate(giftCard.createdAt, { locale, timeZone, dateStyle: 'medium' });
    const expiresLabel = formatDate(giftCard.expiresAt, { locale, timeZone, dateStyle: 'medium' });

    return (
        <Link
            to="/{-$locale}/admin/gift-cards/$giftCardId"
            params={{ giftCardId: giftCard.giftCardId }}
            className={cn(
                'flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
                bookingRequestCardInteractionClassName,
            )}
        >
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={paymentStatus === 'PAYED' ? 'default' : 'secondary'}>
                    {adminGiftCardPaymentStatusLabel(paymentStatus, locale)}
                </Badge>
                <span className="text-xs text-muted-foreground">{createdLabel}</span>
            </div>
            <p className="line-clamp-1 font-medium text-foreground">{giftCard.occasion}</p>
            <p className="truncate text-sm text-muted-foreground">
                {giftCard.recipientName}
                {' · '}
                {giftCard.buyerEmail}
            </p>
            <p className="tabular-nums text-sm font-medium text-foreground">{amountLabel}</p>
            <p className="mt-auto text-xs text-muted-foreground">
                {
                    {
                        de: `Code ${giftCard.redeemCode} · gültig bis ${expiresLabel}`,
                        en: `Code ${giftCard.redeemCode} · expires ${expiresLabel}`,
                    }[locale]
                }
            </p>
        </Link>
    );
}
