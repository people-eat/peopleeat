import { BadgePercentIcon, MinusCircleIcon, PhoneIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation } from 'urql';

import { t } from '../../i18n/t';
import { formatCurrency } from '../../shared';
import {
    ProfileBookingRequestChurnPromoCodeCreateDocument,
    ProfileBookingRequestDiscountUpdateDocument,
    ProfileBookingRequestRequestRecallDocument,
} from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { StatusBadge } from './base/status-badge';

const CHURN_DISCOUNT_AMOUNT_CENTS = 5000;

type ChurnOption = 'DISCOUNT' | 'RECALL' | 'CANCEL';

export type UserBookingRequestChurnDialogProps = {
    bookingRequestId: string;
    open: boolean;
    onClose: () => void;
    onProceedWithCancellation: () => void;
    onDiscountApplied: () => void;
    onRecallRequested: () => void;
};

export function UserBookingRequestChurnDialog({
    bookingRequestId,
    open,
    onClose,
    onProceedWithCancellation,
    onDiscountApplied,
    onRecallRequested,
}: UserBookingRequestChurnDialogProps) {
    const locale = useLocale();
    const [selectedOption, setSelectedOption] = useState<ChurnOption>('DISCOUNT');
    const [promoRedeemCode, setPromoRedeemCode] = useState<string | undefined>();
    const [discountError, setDiscountError] = useState(false);
    const [busy, setBusy] = useState(false);

    const [, createChurnPromoCode] = useMutation(ProfileBookingRequestChurnPromoCodeCreateDocument);
    const [, updateDiscount] = useMutation(ProfileBookingRequestDiscountUpdateDocument);
    const [, requestRecall] = useMutation(ProfileBookingRequestRequestRecallDocument);

    useEffect(() => {
        if (!open) return;
        setSelectedOption('DISCOUNT');
        setDiscountError(false);
        setPromoRedeemCode(undefined);
        setBusy(false);

        void (async () => {
            const result = await createChurnPromoCode({ bookingRequestId });
            const referenceId = result.data?.user.bookingRequestChurnPromoCodeCreate.referenceId;
            if (result.data?.user.bookingRequestChurnPromoCodeCreate.success && referenceId) {
                setPromoRedeemCode(referenceId);
            }
        })();
    }, [bookingRequestId, createChurnPromoCode, open]);

    async function handleContinue() {
        if (busy) return;
        setBusy(true);
        setDiscountError(false);

        try {
            switch (selectedOption) {
                case 'DISCOUNT': {
                    if (!promoRedeemCode) {
                        setDiscountError(true);
                        return;
                    }
                    const result = await updateDiscount({ bookingRequestId, redeemCode: promoRedeemCode });
                    if (!result.data?.user.bookingRequestDiscountUpdate.success) {
                        setDiscountError(true);
                        return;
                    }
                    onDiscountApplied();
                    onClose();
                    break;
                }
                case 'RECALL': {
                    const result = await requestRecall({ bookingRequestId });
                    if (!result.data?.user.bookingRequestRequestRecall.success) {
                        return;
                    }
                    onRecallRequested();
                    onClose();
                    break;
                }
                case 'CANCEL': {
                    onProceedWithCancellation();
                    break;
                }
            }
        } finally {
            setBusy(false);
        }
    }

    const discountAmount = formatCurrency(CHURN_DISCOUNT_AMOUNT_CENTS, { locale });
    const buttonLabel = {
        DISCOUNT: t(locale, 'profileCustomer', 'm.applyDiscount'),
        RECALL: t(locale, 'profileCustomer', 'm.requestACallBack'),
        CANCEL: t(locale, 'profileCustomer', 'm.continue'),
    }[selectedOption];

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onClose();
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t(locale, 'profileCustomer', 'm.waitBeforeYouGo')}</DialogTitle>
                    <DialogDescription>{t(locale, 'profileCustomer', 'm.weWantToMakeSureYou')}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <ChurnOptionCard
                        selected={selectedOption === 'DISCOUNT'}
                        selectedBorderClass="border-emerald-500"
                        onClick={() => {
                            setSelectedOption('DISCOUNT');
                            setDiscountError(false);
                        }}
                        icon={
                            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                                <BadgePercentIcon className="size-5" />
                            </div>
                        }
                        title={t(locale, 'profileCustomer', 'm.discountJustForYou', { v1: discountAmount })}
                        badge={t(locale, 'profileCustomer', 'm.recommended')}
                        description={t(locale, 'profileCustomer', 'm.weWantYourEveningTo', { v1: discountAmount })}
                    >
                        {discountError ? (
                            <p className="text-sm text-destructive" role="alert">
                                {t(locale, 'profileCustomer', 'm.theDiscountCodeIsNoLonger')}
                            </p>
                        ) : null}
                    </ChurnOptionCard>

                    <ChurnOptionCard
                        selected={selectedOption === 'RECALL'}
                        selectedBorderClass="border-sky-500"
                        onClick={() => setSelectedOption('RECALL')}
                        icon={
                            <div className="rounded-full bg-sky-100 p-2 text-sky-700">
                                <PhoneIcon className="size-5" />
                            </div>
                        }
                        title={t(locale, 'profileCustomer', 'm.requestACallBack')}
                        description={t(locale, 'profileCustomer', 'm.weWillCallYouBackAnd')}
                    />

                    <ChurnOptionCard
                        selected={selectedOption === 'CANCEL'}
                        selectedBorderClass="border-muted-foreground"
                        onClick={() => setSelectedOption('CANCEL')}
                        icon={
                            <div className="rounded-full bg-muted p-2 text-muted-foreground">
                                <MinusCircleIcon className="size-5" />
                            </div>
                        }
                        title={t(locale, 'profileCustomer', 'm.cancelRequestAnyway')}
                        description={t(locale, 'profileCustomer', 'm.sorryItDidnTWorkOut')}
                    />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                        {t(locale, 'profileCustomer', 'm.close')}
                    </Button>
                    <Button type="button" onClick={() => void handleContinue()} disabled={busy}>
                        {buttonLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ChurnOptionCard({
    selected,
    selectedBorderClass,
    onClick,
    icon,
    title,
    badge,
    description,
    children,
}: {
    selected: boolean;
    selectedBorderClass: string;
    onClick: () => void;
    icon: ReactNode;
    title: string;
    badge?: string;
    description: string;
    children?: ReactNode;
}) {
    return (
        <button
            type="button"
            className={cn(
                'rounded-xl border-2 p-4 text-left transition',
                selected ? selectedBorderClass : 'border-border bg-card hover:border-muted-foreground/40',
            )}
            onClick={onClick}
        >
            <div className="flex items-start gap-3">
                <div className="shrink-0">{icon}</div>
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{title}</h3>
                        {badge ? <StatusBadge tone="success">{badge}</StatusBadge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            {selected && children ? <div className="mt-3 ml-11">{children}</div> : null}
        </button>
    );
}
