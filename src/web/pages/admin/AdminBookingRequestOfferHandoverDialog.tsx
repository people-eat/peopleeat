import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { userDisplayName } from '../../../shared';
import { Button } from '../../components/base/button';
import { Checkbox } from '../../components/base/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { AdminBookingRequestOfferHandoverDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';

type HandoverCookOption = {
    cookId: string;
    estimatedTravelDistanceKm: number;
    city: string | null | undefined;
    firstName: string;
    lastName: string;
};

export function AdminBookingRequestOfferHandoverDialog({
    open,
    onOpenChange,
    bookingRequestOfferId,
    sourceCookId,
    paymentStatus,
    hasConfiguredMenu,
    cooks,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bookingRequestOfferId: string;
    sourceCookId: string;
    paymentStatus: string;
    hasConfiguredMenu: boolean;
    cooks: readonly HandoverCookOption[];
    onSuccess: (newOfferId: string) => void;
}) {
    const locale = useLocale();
    const [, handover] = useMutation(AdminBookingRequestOfferHandoverDocument);
    const [cookId, setCookId] = useState('');
    const [copyPrice, setCopyPrice] = useState(true);
    const [copyConfiguredMenu, setCopyConfiguredMenu] = useState(hasConfiguredMenu);
    const [copyScheduleTimestamps, setCopyScheduleTimestamps] = useState(true);
    const [copyChatMessages, setCopyChatMessages] = useState(true);
    const [confirmOutOfSystem, setConfirmOutOfSystem] = useState(false);
    const [busy, setBusy] = useState(false);

    const eligibleCooks = cooks.filter((cook) => cook.cookId !== sourceCookId);
    const needsOutOfSystemConfirm = paymentStatus === 'PAYED_OUT_OF_SYSTEM';
    const blockedTransferred = paymentStatus === 'TRANSFERRED';

    async function onConfirm() {
        if (busy || blockedTransferred || cookId.length === 0) return;
        if (needsOutOfSystemConfirm && !confirmOutOfSystem) {
            toast.error(t(locale, 'admin', 'copy.pleaseConfirmThatOutOfSystemMoneyHasBeenHandled'));
            return;
        }
        setBusy(true);
        try {
            const result = await handover({
                input: {
                    bookingRequestOfferId,
                    cookId,
                    copyPrice,
                    copyConfiguredMenu: copyConfiguredMenu && hasConfiguredMenu,
                    copyScheduleTimestamps,
                    copyChatMessages,
                    confirmOutOfSystemMoneyHandled: needsOutOfSystemConfirm ? confirmOutOfSystem : null,
                },
            });
            const newOfferId = result.data?.admin.bookingRequestOfferHandover.referenceId;
            if (!result.data?.admin.bookingRequestOfferHandover.success || !newOfferId) {
                throw new Error('handover failed');
            }
            onOpenChange(false);
            toast.success(t(locale, 'admin', 'copy.offerHandedOver'));
            onSuccess(newOfferId);
        } catch {
            toast.error(t(locale, 'admin', 'copy.handoverFailedCheckPaymentStatusAndCookStripeReadiness'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!busy) {
                    if (next) {
                        setCookId('');
                        setCopyPrice(true);
                        setCopyConfiguredMenu(hasConfiguredMenu);
                        setCopyScheduleTimestamps(true);
                        setCopyChatMessages(true);
                        setConfirmOutOfSystem(false);
                    }
                    onOpenChange(next);
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t(locale, 'admin', 'copy.handOverOffer')}</DialogTitle>
                    <DialogDescription>
                        {t(locale, 'admin', 'copy.closesTheCurrentAcceptedOfferAndCreatesANewAcceptedOfferForA')}
                    </DialogDescription>
                </DialogHeader>

                {blockedTransferred ? (
                    <p className="text-sm text-destructive" role="alert">
                        {t(locale, 'admin', 'copy.afterABankPayoutTransferredAutomaticHandoverIsBlockedReverse')}
                    </p>
                ) : (
                    <div className="grid gap-4">
                        <div className="grid gap-1.5">
                            <span className="text-sm font-medium">{t(locale, 'admin', 'copy.newCook')}</span>
                            <Select value={cookId.length > 0 ? cookId : undefined} onValueChange={(next) => next && setCookId(next)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t(locale, 'admin', 'copy.chooseCook')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {eligibleCooks.map((cook) => {
                                        const city = cook.city;
                                        return (
                                            <SelectItem key={cook.cookId} value={cook.cookId}>
                                                {userDisplayName(cook)}
                                                {city ? ` · ${city}` : ''}
                                                {` · ${Math.round(cook.estimatedTravelDistanceKm * 10) / 10} km`}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <label className="flex items-start gap-2 text-sm">
                            <Checkbox checked={copyPrice} onCheckedChange={(checked) => setCopyPrice(checked === true)} />
                            <span>{t(locale, 'admin', 'copy.copyPriceMenuTravel')}</span>
                        </label>
                        {hasConfiguredMenu ? (
                            <label className="flex items-start gap-2 text-sm">
                                <Checkbox
                                    checked={copyConfiguredMenu}
                                    onCheckedChange={(checked) => setCopyConfiguredMenu(checked === true)}
                                />
                                <span>{t(locale, 'admin', 'copy.copyConfiguredMenu')}</span>
                            </label>
                        ) : null}
                        <label className="flex items-start gap-2 text-sm">
                            <Checkbox
                                checked={copyScheduleTimestamps}
                                onCheckedChange={(checked) => setCopyScheduleTimestamps(checked === true)}
                            />
                            <span>{t(locale, 'admin', 'copy.copyPaymentAndPayoutDates')}</span>
                        </label>
                        <label className="flex items-start gap-2 text-sm">
                            <Checkbox checked={copyChatMessages} onCheckedChange={(checked) => setCopyChatMessages(checked === true)} />
                            <span>{t(locale, 'admin', 'copy.copyChatMessagesNotSystemEvents')}</span>
                        </label>
                        {needsOutOfSystemConfirm ? (
                            <label className="flex items-start gap-2 text-sm">
                                <Checkbox
                                    checked={confirmOutOfSystem}
                                    onCheckedChange={(checked) => setConfirmOutOfSystem(checked === true)}
                                />
                                <span>{t(locale, 'admin', 'copy.outOfSystemMoneyHasBeenHandled')}</span>
                            </label>
                        ) : null}
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                        {t(locale, 'admin', 'copy.cancel')}
                    </Button>
                    <Button type="button" disabled={busy || blockedTransferred || cookId.length === 0} onClick={() => void onConfirm()}>
                        {busy ? t(locale, 'admin', 'copy.handingOver') : t(locale, 'admin', 'copy.handOver')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
