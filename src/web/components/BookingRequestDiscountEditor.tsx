import { useForm, useSelector } from '@tanstack/react-form';
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
    const redeemErrorId = `${redeemInputId}-error`;
    const [removeBusy, setRemoveBusy] = useState(false);
    const [awaitingServer, setAwaitingServer] = useState<AwaitingServer | null>(null);
    const [redeemInvalid, setRedeemInvalid] = useState(false);

    const appliedKind: 'promo' | 'giftCard' | null = promoCode != null ? 'promo' : giftCard != null ? 'giftCard' : null;
    const appliedRedeemCode = promoCode?.redeemCode ?? giftCard?.redeemCode ?? null;
    const amountCents =
        appliedKind === 'promo' ? (promoCode?.amountCents ?? null) : appliedKind === 'giftCard' ? (giftCard?.balanceCents ?? null) : null;
    const hasDiscount = appliedKind != null && appliedRedeemCode != null && amountCents != null;

    const form = useForm({
        defaultValues: {
            redeemCode: '',
        },
        onSubmit: async ({ value }) => {
            if (removeBusy || awaitingServer != null || !canEdit) return;
            const trimmedCode = value.redeemCode.trim();
            if (trimmedCode.length === 0) {
                setRedeemInvalid(true);
                return;
            }
            try {
                const success = await onDiscountUpdate({
                    bookingRequestId,
                    redeemCode: trimmedCode,
                });
                if (!success) {
                    throw new Error('discount update failed');
                }
                form.reset();
                setRedeemInvalid(false);
                setAwaitingServer('applied');
                toast.success({ de: 'Code eingelöst.', en: 'Code redeemed.' }[locale]);
            } catch {
                setRedeemInvalid(true);
            }
        },
    });
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const controlsBusy = removeBusy || awaitingServer != null || isSubmitting;

    useEffect(() => {
        if (awaitingServer === 'applied' && hasDiscount) setAwaitingServer(null);
        if (awaitingServer === 'cleared' && !hasDiscount) setAwaitingServer(null);
    }, [awaitingServer, hasDiscount]);

    async function removeDiscount() {
        if (controlsBusy || !canEdit) return;
        setRemoveBusy(true);
        try {
            const success = await onDiscountUpdate({
                bookingRequestId,
                redeemCode: null,
            });
            if (!success) {
                throw new Error('discount update failed');
            }
            form.reset();
            setRedeemInvalid(false);
            setAwaitingServer('cleared');
            toast.success({ de: 'Rabatt entfernt.', en: 'Discount removed.' }[locale]);
        } catch {
            toast.error(
                {
                    de: 'Rabatt konnte nicht entfernt werden.',
                    en: 'Could not remove the discount.',
                }[locale],
            );
        } finally {
            setRemoveBusy(false);
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
                            <Button type="button" variant="outline" size="sm" disabled={controlsBusy} onClick={() => void removeDiscount()}>
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
                <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field name="redeemCode">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor={redeemInputId} className="text-sm font-medium text-foreground">
                                    {{ de: 'Gutschein oder Promocode einlösen', en: 'Redeem voucher or promo code' }[locale]}
                                </label>
                                <Input
                                    id={redeemInputId}
                                    value={field.state.value}
                                    disabled={controlsBusy}
                                    onChange={(event) => {
                                        field.handleChange(event.target.value);
                                        setRedeemInvalid(false);
                                    }}
                                    onBlur={field.handleBlur}
                                    placeholder={{ de: 'Code eingeben', en: 'Enter code' }[locale]}
                                    autoComplete="off"
                                    spellCheck={false}
                                    aria-invalid={redeemInvalid || undefined}
                                    aria-describedby={redeemInvalid ? redeemErrorId : undefined}
                                />
                                {redeemInvalid ? (
                                    <p id={redeemErrorId} className="text-sm text-destructive" role="alert">
                                        {{ de: 'Rabattcode ungültig.', en: 'This code is invalid.' }[locale]}
                                    </p>
                                ) : null}
                            </div>
                        )}
                    </form.Field>
                    <div className="flex flex-wrap justify-end gap-2">
                        <form.Subscribe selector={(state) => [state.canSubmit, state.values.redeemCode] as const}>
                            {([canSubmit, redeemCode]) => (
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={controlsBusy || !canSubmit || redeemCode.trim().length === 0}
                                >
                                    {{ de: 'Einlösen', en: 'Redeem' }[locale]}
                                </Button>
                            )}
                        </form.Subscribe>
                    </div>
                </form>
            ) : null}
        </div>
    );
}
