import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { ProfileCustomerBookingRequestOfferDeclineDocument } from '../graphql/generated';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Textarea } from './base/textarea';

const DECLINE_REASON_KEYS = [
    'declineOffer.reason.tooExpensive',
    'declineOffer.reason.menusNotMatching',
    'declineOffer.reason.requestsIgnored',
] as const;

export type CustomerBookingRequestOfferDeclineDialogProps = {
    bookingRequestOfferId: string;
    open: boolean;
    onClose: () => void;
    onCompleted?: () => void;
};

export function CustomerBookingRequestOfferDeclineDialog({
    bookingRequestOfferId,
    open,
    onClose,
    onCompleted,
}: CustomerBookingRequestOfferDeclineDialogProps) {
    const { t } = useT('profileCustomer');
    const reasonId = useId();
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [, declineOffer] = useMutation(ProfileCustomerBookingRequestOfferDeclineDocument);

    useEffect(() => {
        if (!open) return;
        setReason('');
        setBusy(false);
    }, [open]);

    async function onDecline() {
        if (busy) return;
        const trimmed = reason.trim();
        if (trimmed.length === 0) {
            toast.error(t('m.pleaseLetUsKnowWhyYouWant'));
            return;
        }
        setBusy(true);
        try {
            const result = await declineOffer({ bookingRequestOfferId, reason: trimmed });
            if (!result.data?.user.bookingRequestOfferDecline.success) {
                throw new Error('decline failed');
            }
            onClose();
            onCompleted?.();
            toast.success(t('m.offerDeclined'));
        } catch {
            toast.error(t('m.couldNotDeclineTheOffer'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onClose();
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('m.declineOffer')}</DialogTitle>
                    <DialogDescription>{t('m.feelFreeToHelpUsImproveOur')}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <label htmlFor={reasonId} className="text-sm font-medium text-foreground">
                            {t('bookingRequest.reason')}
                        </label>
                        <p className="text-sm text-muted-foreground">{t('m.pleaseChooseOneOfTheSuggestionsOr')}</p>
                        <Textarea
                            id={reasonId}
                            rows={3}
                            value={reason}
                            disabled={busy}
                            onChange={(event) => setReason(event.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={t('m.suggestedReasons')}>
                        {DECLINE_REASON_KEYS.map((key) => {
                            const option = t(key);
                            const selected = reason === option;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    disabled={busy}
                                    aria-pressed={selected}
                                    className={cn(
                                        'rounded-full border px-3 py-1.5 text-left text-xs transition',
                                        selected
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-background hover:bg-muted',
                                    )}
                                    onClick={() => setReason(selected ? '' : option)}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
                        {t('actions.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={busy || reason.trim().length === 0}
                        onClick={() => void onDecline()}
                    >
                        {busy ? t('declineOffer.declining') : t('declineOffer.decline')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
