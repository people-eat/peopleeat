import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { ProfileCustomerBookingRequestOfferDeclineDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Textarea } from './base/textarea';

const DECLINE_REASONS: Record<Locale, readonly string[]> = {
    de: [
        '💰 Angebot war zu teuer',
        '🍽️ Menüs waren nicht das, wonach ich gesucht habe',
        '🧑‍🍳 Meine speziellen Wünsche wurden nicht berücksichtigt',
    ],
    en: ['💰 Offer was too expensive', '🍽️ Menus were not what I was looking for', '🧑‍🍳 My special requests were not considered'],
};

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
    const locale = useLocale();
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
            toast.error(
                {
                    de: 'Bitte lass uns wissen, warum du dieses Angebot ablehnen möchtest.',
                    en: 'Please let us know why you want to decline the offer.',
                }[locale],
            );
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
            toast.success({ de: 'Angebot abgelehnt.', en: 'Offer declined.' }[locale]);
        } catch {
            toast.error({ de: 'Ablehnung fehlgeschlagen.', en: 'Could not decline the offer.' }[locale]);
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
                    <DialogTitle>{{ de: 'Angebot ablehnen', en: 'Decline offer' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Hilf uns gerne, unseren Service zu verbessern, und sag uns kurz, warum du dieses Angebot ablehnen möchtest.',
                                en: 'Feel free to help us improve our service by briefly letting us know why you want to decline this offer.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <label htmlFor={reasonId} className="text-sm font-medium text-foreground">
                            {{ de: 'Grund', en: 'Reason' }[locale]}
                        </label>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Wähle einen der Vorschläge aus oder beschreibe kurz den Grund deiner Absage.',
                                    en: 'Please choose one of the suggestions or briefly describe the reason for your decline.',
                                }[locale]
                            }
                        </p>
                        <Textarea
                            id={reasonId}
                            rows={3}
                            value={reason}
                            disabled={busy}
                            onChange={(event) => setReason(event.target.value)}
                        />
                    </div>
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={{ de: 'Vorgeschlagene Gründe', en: 'Suggested reasons' }[locale]}
                    >
                        {DECLINE_REASONS[locale].map((option) => {
                            const selected = reason === option;
                            return (
                                <button
                                    key={option}
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
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={busy || reason.trim().length === 0}
                        onClick={() => void onDecline()}
                    >
                        {{ de: busy ? 'Wird abgelehnt…' : 'Ablehnen', en: busy ? 'Declining…' : 'Decline' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
