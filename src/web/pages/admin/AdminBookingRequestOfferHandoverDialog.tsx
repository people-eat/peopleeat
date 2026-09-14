import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

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
            toast.error(
                {
                    de: 'Bitte bestätigen, dass die Zahlung außerhalb von Stripe geklärt ist.',
                    en: 'Please confirm that out-of-system money has been handled.',
                }[locale],
            );
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
            toast.success({ de: 'Angebot übergeben.', en: 'Offer handed over.' }[locale]);
            onSuccess(newOfferId);
        } catch {
            toast.error(
                {
                    de: 'Übergabe fehlgeschlagen. Prüfe Zahlung und Koch-Stripe-Status.',
                    en: 'Handover failed. Check payment status and cook Stripe readiness.',
                }[locale],
            );
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
                    <DialogTitle>{{ de: 'Angebot übergeben', en: 'Hand over offer' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Schließt das aktuelle akzeptierte Angebot und legt ein neues akzeptiertes Angebot für einen anderen Koch an.',
                                en: 'Closes the current accepted offer and creates a new accepted offer for another cook.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>

                {blockedTransferred ? (
                    <p className="text-sm text-destructive" role="alert">
                        {
                            {
                                de: 'Nach einer Bank-Auszahlung (TRANSFERRED) ist die automatische Übergabe gesperrt. Bitte zuerst in Stripe zurückbuchen.',
                                en: 'After a bank payout (TRANSFERRED), automatic handover is blocked. Reverse the payout in Stripe first.',
                            }[locale]
                        }
                    </p>
                ) : (
                    <div className="grid gap-4">
                        <div className="grid gap-1.5">
                            <span className="text-sm font-medium">{{ de: 'Neuer Koch', en: 'New cook' }[locale]}</span>
                            <Select value={cookId.length > 0 ? cookId : undefined} onValueChange={(next) => next && setCookId(next)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={{ de: 'Koch wählen…', en: 'Choose cook…' }[locale]} />
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
                            <span>{{ de: 'Preis übernehmen (Menü + Anreise)', en: 'Copy price (menu + travel)' }[locale]}</span>
                        </label>
                        {hasConfiguredMenu ? (
                            <label className="flex items-start gap-2 text-sm">
                                <Checkbox
                                    checked={copyConfiguredMenu}
                                    onCheckedChange={(checked) => setCopyConfiguredMenu(checked === true)}
                                />
                                <span>{{ de: 'Konfiguriertes Menü übernehmen', en: 'Copy configured menu' }[locale]}</span>
                            </label>
                        ) : null}
                        <label className="flex items-start gap-2 text-sm">
                            <Checkbox
                                checked={copyScheduleTimestamps}
                                onCheckedChange={(checked) => setCopyScheduleTimestamps(checked === true)}
                            />
                            <span>
                                {
                                    {
                                        de: 'Zahlungs- und Auszahlungstermine übernehmen',
                                        en: 'Copy payment and payout dates',
                                    }[locale]
                                }
                            </span>
                        </label>
                        <label className="flex items-start gap-2 text-sm">
                            <Checkbox checked={copyChatMessages} onCheckedChange={(checked) => setCopyChatMessages(checked === true)} />
                            <span>
                                {
                                    {
                                        de: 'Chat-Nachrichten übernehmen (ohne Systemereignisse)',
                                        en: 'Copy chat messages (not system events)',
                                    }[locale]
                                }
                            </span>
                        </label>
                        {needsOutOfSystemConfirm ? (
                            <label className="flex items-start gap-2 text-sm">
                                <Checkbox
                                    checked={confirmOutOfSystem}
                                    onCheckedChange={(checked) => setConfirmOutOfSystem(checked === true)}
                                />
                                <span>
                                    {
                                        {
                                            de: 'Zahlung außerhalb von Stripe ist geklärt',
                                            en: 'Out-of-system money has been handled',
                                        }[locale]
                                    }
                                </span>
                            </label>
                        ) : null}
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="button" disabled={busy || blockedTransferred || cookId.length === 0} onClick={() => void onConfirm()}>
                        {busy ? { de: 'Übergeben…', en: 'Handing over…' }[locale] : { de: 'Übergeben', en: 'Hand over' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
