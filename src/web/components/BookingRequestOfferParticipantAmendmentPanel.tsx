import { useState } from 'react';

import { bookingRequestParticipantsFromCounts, formatCurrency, formatParticipants } from '../../shared';
import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Input } from './base/input';
import { StatusAlert } from './base/status-alert';

type AmendmentPreview = {
    requestedAt: string;
    participants: { type: 'ADULT' | 'DISCOUNTED'; name: string; restrictions: string[] }[];
    menuPriceCentsBefore: number;
    menuPriceCentsAfter: number;
    totalCentsCustomerBefore: number;
    totalCentsCustomerAfter: number;
    payoutCentsCookBefore: number;
    payoutCentsCookAfter: number;
};

type CurrentParticipant = { type: 'ADULT' | 'DISCOUNTED'; name: string; restrictions: string[] };

export function BookingRequestOfferParticipantAmendmentCustomerPanel(props: {
    locale: Locale;
    canRequest: boolean;
    preparationsCompletedAt: string | null;
    amendment: AmendmentPreview | null;
    currentParticipants: CurrentParticipant[];
    busy: boolean;
    onPropose: (participants: CurrentParticipant[]) => Promise<void>;
}) {
    const enabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT');
    const [open, setOpen] = useState(false);
    const [adultCount, setAdultCount] = useState(() => props.currentParticipants.filter((p) => p.type === 'ADULT').length || 1);
    const [childCount, setChildCount] = useState(() => props.currentParticipants.filter((p) => p.type === 'DISCOUNTED').length);

    if (!enabled) return null;

    if (props.amendment) {
        const adults = props.amendment.participants.filter((p) => p.type === 'ADULT').length;
        const discounted = props.amendment.participants.filter((p) => p.type === 'DISCOUNTED').length;
        return (
            <StatusAlert tone="info" title={{ de: 'Änderung vorgeschlagen', en: 'Change proposed' }[props.locale]}>
                {
                    {
                        de: `Dein Vorschlag (${formatParticipants({ adultCount: adults, discountedCount: discounted }, { locale: props.locale })}) wartet auf die Bestätigung des Kochs. Neuer Gastgeberpreis: ${formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale })}.`,
                        en: `Your proposal (${formatParticipants({ adultCount: adults, discountedCount: discounted }, { locale: props.locale })}) is waiting for the chef to confirm. New host price: ${formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale })}.`,
                    }[props.locale]
                }
            </StatusAlert>
        );
    }

    if (props.preparationsCompletedAt) {
        return (
            <StatusAlert tone="info" title={{ de: 'Einkauf abgeschlossen', en: 'Shopping completed' }[props.locale]}>
                {
                    {
                        de: 'Dein Koch hat den Einkauf bzw. die Vorbereitung bereits erledigt. Die Teilnehmerzahl kann nicht mehr geändert werden.',
                        en: 'Your chef has already completed grocery shopping or preparations. The number of participants can no longer be changed.',
                    }[props.locale]
                }
            </StatusAlert>
        );
    }

    if (!props.canRequest) return null;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Du möchtest die Teilnehmerzahl nach der Annahme ändern?',
                            en: 'Need to change the number of participants after accepting?',
                        }[props.locale]
                    }
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={props.busy}
                    onClick={() => {
                        setAdultCount(props.currentParticipants.filter((p) => p.type === 'ADULT').length || 1);
                        setChildCount(props.currentParticipants.filter((p) => p.type === 'DISCOUNTED').length);
                        setOpen(true);
                    }}
                >
                    {{ de: 'Teilnehmer ändern', en: 'Change participants' }[props.locale]}
                </Button>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{{ de: 'Teilnehmerzahl ändern', en: 'Change participants' }[props.locale]}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Dein Koch muss die Änderung bestätigen. Bei weniger Personen erfolgt eine Erstattung, bei mehr Personen eine Nachzahlung.',
                                    en: 'Your chef must confirm the change. Fewer guests means a refund; more guests means an additional charge.',
                                }[props.locale]
                            }
                        </p>
                        <div className="grid gap-2">
                            <label htmlFor="amendment-adults" className="text-sm font-medium">
                                {{ de: 'Erwachsene', en: 'Adults' }[props.locale]}
                            </label>
                            <Input
                                id="amendment-adults"
                                type="number"
                                min={1}
                                value={adultCount}
                                onChange={(event) => setAdultCount(Math.max(1, Number(event.target.value) || 1))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="amendment-children" className="text-sm font-medium">
                                {{ de: 'Kinder', en: 'Children' }[props.locale]}
                            </label>
                            <Input
                                id="amendment-children"
                                type="number"
                                min={0}
                                value={childCount}
                                onChange={(event) => setChildCount(Math.max(0, Number(event.target.value) || 0))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[props.locale]}
                        </Button>
                        <Button
                            type="button"
                            disabled={props.busy}
                            onClick={async () => {
                                const participants = bookingRequestParticipantsFromCounts({
                                    adultCount,
                                    discountedCount: childCount,
                                    locale: props.locale,
                                });
                                await props.onPropose(participants);
                                setOpen(false);
                            }}
                        >
                            {{ de: 'Vorschlag senden', en: 'Send proposal' }[props.locale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function BookingRequestOfferParticipantAmendmentCookPanel(props: {
    locale: Locale;
    amendment: AmendmentPreview | null;
    canCompletePreparations: boolean;
    preparationsCompletedAt: string | null;
    busy: boolean;
    onAccept: () => Promise<void>;
    onDecline: () => Promise<void>;
    onPreparationsComplete: () => Promise<void>;
}) {
    const enabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT');
    if (!enabled) return null;
    if (!props.amendment && !props.preparationsCompletedAt && !props.canCompletePreparations) return null;

    return (
        <div className="grid gap-3">
            {props.amendment ? (
                <StatusAlert
                    tone="warning"
                    title={{ de: 'Teilnehmeränderung prüfen', en: 'Review participant change' }[props.locale]}
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" disabled={props.busy} onClick={() => void props.onDecline()}>
                                {{ de: 'Ablehnen', en: 'Decline' }[props.locale]}
                            </Button>
                            <Button type="button" size="sm" disabled={props.busy} onClick={() => void props.onAccept()}>
                                {{ de: 'Annehmen', en: 'Accept' }[props.locale]}
                            </Button>
                        </div>
                    }
                >
                    {
                        {
                            de: `Neu: ${formatParticipants(
                                {
                                    adultCount: props.amendment.participants.filter((p) => p.type === 'ADULT').length,
                                    discountedCount: props.amendment.participants.filter((p) => p.type === 'DISCOUNTED').length,
                                },
                                { locale: props.locale },
                            )}. Auszahlung ${formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale })}.`,
                            en: `New: ${formatParticipants(
                                {
                                    adultCount: props.amendment.participants.filter((p) => p.type === 'ADULT').length,
                                    discountedCount: props.amendment.participants.filter((p) => p.type === 'DISCOUNTED').length,
                                },
                                { locale: props.locale },
                            )}. Payout ${formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale })}.`,
                        }[props.locale]
                    }
                </StatusAlert>
            ) : null}

            {props.preparationsCompletedAt ? (
                <StatusAlert tone="info" title={{ de: 'Einkauf markiert', en: 'Shopping marked done' }[props.locale]}>
                    {
                        {
                            de: 'Du hast den Einkauf bzw. die Vorbereitung als erledigt markiert. Der Gast kann die Teilnehmerzahl nicht mehr ändern.',
                            en: 'You marked grocery shopping or preparations as done. The guest can no longer change the number of participants.',
                        }[props.locale]
                    }
                </StatusAlert>
            ) : props.canCompletePreparations ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Einkauf oder Vorbereitung für die aktuelle Personenzahl erledigt?',
                                en: 'Finished shopping or prep for the current headcount?',
                            }[props.locale]
                        }
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={props.busy}
                        onClick={() => void props.onPreparationsComplete()}
                    >
                        {{ de: 'Einkauf erledigt', en: 'Mark shopping done' }[props.locale]}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}

export function BookingRequestOfferParticipantAmendmentAdminPanel(props: {
    locale: Locale;
    amendment: AmendmentPreview | null;
    preparationsCompletedAt: string | null;
    busy: boolean;
    onClearPreparations: () => Promise<void>;
}) {
    // Admin shell keeps ops controls visible even when the product toggle is off.
    if (!props.amendment && !props.preparationsCompletedAt) return null;

    return (
        <div className="grid gap-3">
            {props.amendment ? (
                <StatusAlert tone="info" title={{ de: 'Offene Teilnehmeränderung', en: 'Pending participant amendment' }[props.locale]}>
                    {
                        {
                            de: `Vorschlag wartet auf den Koch. Gastgeberpreis ${formatCurrency(props.amendment.totalCentsCustomerBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale })}.`,
                            en: `Proposal waiting on the chef. Host price ${formatCurrency(props.amendment.totalCentsCustomerBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale })}.`,
                        }[props.locale]
                    }
                </StatusAlert>
            ) : null}
            {props.preparationsCompletedAt ? (
                <StatusAlert
                    tone="info"
                    title={{ de: 'Vorbereitung gesperrt', en: 'Preparations locked' }[props.locale]}
                    action={
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={props.busy}
                            onClick={() => void props.onClearPreparations()}
                        >
                            {{ de: 'Sperre aufheben', en: 'Clear lock' }[props.locale]}
                        </Button>
                    }
                >
                    {
                        {
                            de: 'Der Koch hat Einkauf/Vorbereitung als erledigt markiert.',
                            en: 'The chef marked shopping/preparations as done.',
                        }[props.locale]
                    }
                </StatusAlert>
            ) : null}
        </div>
    );
}
