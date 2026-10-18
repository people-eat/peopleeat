import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

import { formatCurrency } from '../../shared';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Input } from './base/input';
import { StatusAlert } from './base/status-alert';

type AppliedPromoCode = {
    redeemCode: string;
    amountCents: number;
};

type AppliedGiftCard = {
    redeemCode: string;
    balanceCents: number;
};

type AwaitingServer = 'applied' | 'cleared';

export function BookingRequestDiscountEditor({
    bookingRequestId,
    locale,
    canEdit,
    promoCode,
    giftCard,
    onDiscountUpdate,
}: {
    bookingRequestId: string;
    locale: Locale;
    canEdit: boolean;
    promoCode: AppliedPromoCode | null | undefined;
    giftCard: AppliedGiftCard | null | undefined;
    onDiscountUpdate: (args: { bookingRequestId: string; redeemCode: string | null }) => Promise<boolean>;
}) {
    const redeemInputId = useId();
    const [redeemCode, setRedeemCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [awaitingServer, setAwaitingServer] = useState<AwaitingServer | null>(null);

    const appliedKind: 'promo' | 'giftCard' | null = promoCode != null ? 'promo' : giftCard != null ? 'giftCard' : null;
    const appliedRedeemCode = promoCode?.redeemCode ?? giftCard?.redeemCode ?? null;
    const amountCents =
        appliedKind === 'promo' ? (promoCode?.amountCents ?? null) : appliedKind === 'giftCard' ? (giftCard?.balanceCents ?? null) : null;
    const hasDiscount = appliedKind != null && appliedRedeemCode != null && amountCents != null;
    const trimmedCode = redeemCode.trim();
    const canRedeem = trimmedCode.length > 0;
    const controlsBusy = busy || awaitingServer != null;

    useEffect(() => {
        if (awaitingServer === 'applied' && hasDiscount) setAwaitingServer(null);
        if (awaitingServer === 'cleared' && !hasDiscount) setAwaitingServer(null);
    }, [awaitingServer, hasDiscount]);

    async function runDiscountUpdate(nextRedeemCode: string | null, mode: 'redeem' | 'remove') {
        if (controlsBusy || !canEdit) return;
        setBusy(true);
        try {
            const success = await onDiscountUpdate({
                bookingRequestId,
                redeemCode: nextRedeemCode,
            });
            if (!success) {
                throw new Error('discount update failed');
            }
            if (mode === 'remove') {
                setRedeemCode('');
                setAwaitingServer('cleared');
                toast.success({ de: 'Rabatt entfernt.', en: 'Discount removed.' }[locale]);
                return;
            }
            setRedeemCode('');
            setAwaitingServer('applied');
            toast.success({ de: 'Code eingelöst.', en: 'Code redeemed.' }[locale]);
        } catch {
            toast.error(
                mode === 'remove'
                    ? {
                          de: 'Rabatt konnte nicht entfernt werden.',
                          en: 'Could not remove the discount.',
                      }[locale]
                    : {
                          de: 'Code konnte nicht eingelöst werden.',
                          en: 'Could not redeem the code.',
                      }[locale],
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="grid max-w-xl gap-4">
            {hasDiscount ? (
                <StatusAlert
                    tone="success"
                    title={
                        {
                            de: appliedKind === 'giftCard' ? 'Gutschein gesichert' : 'Promocode gesichert',
                            en: appliedKind === 'giftCard' ? 'Gift card secured' : 'Promo code secured',
                        }[locale]
                    }
                    action={
                        canEdit ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={controlsBusy}
                                onClick={() => void runDiscountUpdate(null, 'remove')}
                            >
                                {{ de: 'Entfernen', en: 'Remove' }[locale]}
                            </Button>
                        ) : undefined
                    }
                >
                    {
                        {
                            de: (
                                <p>
                                    {appliedKind === 'giftCard' ? 'Gutschein' : 'Promocode'}{' '}
                                    <span className="font-semibold text-foreground">{appliedRedeemCode}</span> (
                                    <span className="font-semibold text-foreground">{formatCurrency(amountCents, { locale })}</span>) ist
                                    gesichert und wird automatisch von den Angebotspreisen abgezogen.
                                </p>
                            ),
                            en: (
                                <p>
                                    {appliedKind === 'giftCard' ? 'Gift card' : 'Promo code'}{' '}
                                    <span className="font-semibold text-foreground">{appliedRedeemCode}</span> (
                                    <span className="font-semibold text-foreground">{formatCurrency(amountCents, { locale })}</span>) is
                                    secured and will be automatically deducted from offer prices.
                                </p>
                            ),
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {canEdit && !hasDiscount ? (
                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <label htmlFor={redeemInputId} className="text-sm font-medium text-foreground">
                            {{ de: 'Gutschein oder Promocode einlösen', en: 'Redeem voucher or promo code' }[locale]}
                        </label>
                        <Input
                            id={redeemInputId}
                            value={redeemCode}
                            disabled={controlsBusy}
                            onChange={(event) => setRedeemCode(event.target.value)}
                            placeholder={{ de: 'Code eingeben', en: 'Enter code' }[locale]}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={controlsBusy || !canRedeem}
                            onClick={() => {
                                if (!canRedeem) {
                                    toast.error({ de: 'Bitte gib einen Code ein.', en: 'Please enter a code.' }[locale]);
                                    return;
                                }
                                void runDiscountUpdate(trimmedCode, 'redeem');
                            }}
                        >
                            {{ de: 'Einlösen', en: 'Redeem' }[locale]}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
