import { BadgePercentIcon, MinusCircleIcon, PhoneIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation } from 'urql';

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

    const buttonLabel = {
        DISCOUNT: { de: 'Rabatt einlösen', en: 'Apply discount' }[locale],
        RECALL: { de: 'Rückruf anfordern', en: 'Request a call back' }[locale],
        CANCEL: { de: 'Weiter', en: 'Continue' }[locale],
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
                    <DialogTitle>{{ de: 'Warte kurz, bevor du gehst.', en: 'Wait, before you go.' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Wir möchten sicherstellen, dass du das bestmögliche Erlebnis bekommst. Hier sind unsere Angebote für dich:',
                                en: 'We want to make sure you get the best possible experience. Here are our offers for you:',
                            }[locale]
                        }
                    </DialogDescription>
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
                        title={
                            {
                                de: `${formatCurrency(CHURN_DISCOUNT_AMOUNT_CENTS, { locale })} Rabatt nur für dich`,
                                en: `${formatCurrency(CHURN_DISCOUNT_AMOUNT_CENTS, { locale })} discount just for you`,
                            }[locale]
                        }
                        badge={{ de: 'Empfohlen', en: 'Recommended' }[locale]}
                        description={
                            {
                                de: `Wir möchten, dass dein Abend unvergesslich wird. Deshalb schenken wir dir exklusiv für diese Buchung einen Rabatt von ${formatCurrency(CHURN_DISCOUNT_AMOUNT_CENTS, { locale })}.`,
                                en: `We want your evening to be unforgettable. That's why we're giving you an exclusive ${formatCurrency(CHURN_DISCOUNT_AMOUNT_CENTS, { locale })} discount for this booking.`,
                            }[locale]
                        }
                    >
                        {discountError ? (
                            <p className="text-sm text-destructive" role="alert">
                                {
                                    {
                                        de: 'Der Rabattcode ist leider nicht mehr gültig.',
                                        en: 'The discount code is no longer valid.',
                                    }[locale]
                                }
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
                        title={{ de: 'Rückruf anfordern', en: 'Request a call back' }[locale]}
                        description={
                            {
                                de: 'Wir rufen dich zurück und finden gemeinsam die beste Lösung für dich.',
                                en: 'We will call you back and find the best solution together.',
                            }[locale]
                        }
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
                        title={{ de: 'Anfrage trotzdem stornieren', en: 'Cancel request anyway' }[locale]}
                        description={
                            {
                                de: 'Schade, dass es nicht geklappt hat. Du kannst jederzeit neu anfragen.',
                                en: "Sorry it didn't work out. You can always make a new request.",
                            }[locale]
                        }
                    />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                        {{ de: 'Schließen', en: 'Close' }[locale]}
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
