import { useForm, useSelector } from '@tanstack/react-form';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

import { t } from '../../i18n/t';
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
                toast.success(t(locale, 'common', 'discount.redeemed'));
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
            toast.success(t(locale, 'common', 'discount.removed'));
        } catch {
            toast.error(t(locale, 'common', 'discount.removeFailed'));
        } finally {
            setRemoveBusy(false);
        }
    }

    return (
        <div className="grid max-w-xl gap-4">
            {hasDiscount ? (
                <StatusAlert
                    tone="success"
                    title={t(locale, 'common', appliedKind === 'giftCard' ? 'discount.giftCardSecured' : 'discount.promoSecured')}
                    action={
                        canEdit ? (
                            <Button type="button" variant="outline" size="sm" disabled={controlsBusy} onClick={() => void removeDiscount()}>
                                {t(locale, 'common', 'remove')}
                            </Button>
                        ) : undefined
                    }
                >
                    <p>
                        {t(locale, 'common', appliedKind === 'giftCard' ? 'discount.giftCard' : 'discount.promoCode')}{' '}
                        <span className="font-semibold text-foreground">{appliedRedeemCode}</span> (
                        <span className="font-semibold text-foreground">{formatCurrency(amountCents, { locale })}</span>){' '}
                        {t(locale, 'common', 'discount.securedSuffix')}
                    </p>
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
                                    {t(locale, 'common', 'discount.redeemTitle')}
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
                                    placeholder={t(locale, 'common', 'discount.enterCode')}
                                    autoComplete="off"
                                    spellCheck={false}
                                    aria-invalid={redeemInvalid || undefined}
                                    aria-describedby={redeemInvalid ? redeemErrorId : undefined}
                                />
                                {redeemInvalid ? (
                                    <p id={redeemErrorId} className="text-sm text-destructive" role="alert">
                                        {t(locale, 'common', 'discount.invalid')}
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
                                    {t(locale, 'common', 'discount.redeem')}
                                </Button>
                            )}
                        </form.Subscribe>
                    </div>
                </form>
            ) : null}
        </div>
    );
}
