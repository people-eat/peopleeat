import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { formatCurrency, formatParticipants } from '../../shared';
import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import type { Locale } from '../utils/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';
import { Button } from './base/button';
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

export function BookingRequestOfferParticipantAmendmentCustomerPanel(props: {
    locale: Locale;
    canRequest: boolean;
    preparationsCompletedAt: string | null;
    amendment: AmendmentPreview | null;
    bookingRequestId: string;
}) {
    const enabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT');

    if (!enabled && !props.amendment && !props.preparationsCompletedAt) return null;

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

    if (!enabled || !props.canRequest) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
                {
                    {
                        de: 'Du möchtest die Teilnehmerzahl nach der Annahme ändern? Nutze die Bearbeitung der Anfrage.',
                        en: 'Need to change the number of participants after accepting? Use Edit on the booking request.',
                    }[props.locale]
                }
            </p>
            <Button type="button" variant="outline" size="sm" asChild>
                <Link
                    to="/{-$locale}/profile/booking-requests/$bookingRequestId/edit"
                    params={{ bookingRequestId: props.bookingRequestId }}
                >
                    {{ de: 'Teilnehmer ändern', en: 'Change participants' }[props.locale]}
                </Link>
            </Button>
        </div>
    );
}

export function BookingRequestOfferParticipantAmendmentCookReview(props: {
    locale: Locale;
    amendment: AmendmentPreview;
    busy: boolean;
    onAccept: () => Promise<void>;
    onDecline: () => Promise<void>;
    /** When false, omit Accept/Decline (e.g. already in the page footer). */
    showActions?: boolean;
}) {
    const showActions = props.showActions !== false;
    return (
        <StatusAlert
            tone="warning"
            title={{ de: 'Teilnehmeränderung prüfen', en: 'Review participant change' }[props.locale]}
            action={
                showActions ? (
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={props.busy} onClick={() => void props.onDecline()}>
                            {{ de: 'Ablehnen', en: 'Decline' }[props.locale]}
                        </Button>
                        <Button type="button" size="sm" disabled={props.busy} onClick={() => void props.onAccept()}>
                            {{ de: 'Annehmen', en: 'Accept' }[props.locale]}
                        </Button>
                    </div>
                ) : undefined
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
                    )}. Auszahlung ${formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale })}. Die Buchung bleibt bestätigt; Zahlung oder Erstattung folgen automatisch nach deiner Entscheidung.`,
                    en: `New: ${formatParticipants(
                        {
                            adultCount: props.amendment.participants.filter((p) => p.type === 'ADULT').length,
                            discountedCount: props.amendment.participants.filter((p) => p.type === 'DISCOUNTED').length,
                        },
                        { locale: props.locale },
                    )}. Payout ${formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale })}. The booking stays confirmed; charge or refund runs automatically after you decide.`,
                }[props.locale]
            }
        </StatusAlert>
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
    /** When true, amendment Accept/Decline are rendered elsewhere (page chrome / footer). */
    amendmentActionsElsewhere?: boolean;
}) {
    const enabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT');
    const [preparationsConfirmOpen, setPreparationsConfirmOpen] = useState(false);
    const [preparationsConfirmBusy, setPreparationsConfirmBusy] = useState(false);

    // Pending amendments stay visible even when the rollout toggle is off.
    if (!props.amendment && !enabled) return null;
    if (!props.amendment && !props.preparationsCompletedAt && !props.canCompletePreparations) return null;

    const confirmBusy = preparationsConfirmBusy || props.busy;
    const showPrep = enabled || props.preparationsCompletedAt != null;

    return (
        <div className="grid gap-3">
            {props.amendment && !props.amendmentActionsElsewhere ? (
                <BookingRequestOfferParticipantAmendmentCookReview
                    locale={props.locale}
                    amendment={props.amendment}
                    busy={props.busy}
                    onAccept={props.onAccept}
                    onDecline={props.onDecline}
                />
            ) : null}

            {showPrep && props.preparationsCompletedAt ? (
                <StatusAlert
                    tone="success"
                    title={{ de: 'Einkauf und Vorbereitung erledigt', en: 'Shopping and prep marked done' }[props.locale]}
                >
                    {
                        {
                            de: 'Der Gast kann die Teilnehmerzahl für diesen Auftrag nicht mehr ändern. Support kann die Sperre bei Bedarf aufheben.',
                            en: 'The guest can no longer change the participant count for this booking. Support can clear the lock if needed.',
                        }[props.locale]
                    }
                </StatusAlert>
            ) : null}

            {showPrep && !props.preparationsCompletedAt && props.canCompletePreparations ? (
                <>
                    <StatusAlert
                        tone="info"
                        title={{ de: 'Einkauf und Vorbereitung', en: 'Shopping and prep' }[props.locale]}
                        action={
                            <Button type="button" size="sm" disabled={props.busy} onClick={() => setPreparationsConfirmOpen(true)}>
                                {{ de: 'Als erledigt markieren', en: 'Mark as done' }[props.locale]}
                            </Button>
                        }
                    >
                        {
                            {
                                de: 'Sobald du den Einkauf oder die Vorbereitung für die aktuelle Personenzahl erledigt hast, markiere es hier. Danach kann der Gast die Teilnehmerzahl nicht mehr ändern.',
                                en: 'Once you have finished shopping or prep for the current headcount, mark it here. After that, the guest can no longer change the number of participants.',
                            }[props.locale]
                        }
                    </StatusAlert>
                    <AlertDialog
                        open={preparationsConfirmOpen}
                        onOpenChange={(open) => {
                            if (!confirmBusy) setPreparationsConfirmOpen(open);
                        }}
                    >
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {
                                        {
                                            de: 'Einkauf und Vorbereitung als erledigt markieren?',
                                            en: 'Mark shopping and prep as done?',
                                        }[props.locale]
                                    }
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Danach kann der Gast die Teilnehmerzahl nicht mehr ändern. Nutze das erst, wenn du für die aktuelle Personenzahl eingekauft oder vorbereitet hast.',
                                            en: 'After this, the guest can no longer change the participant count. Only do this once you have shopped or prepared for the current headcount.',
                                        }[props.locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={confirmBusy}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[props.locale]}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={confirmBusy}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        void (async () => {
                                            setPreparationsConfirmBusy(true);
                                            try {
                                                await props.onPreparationsComplete();
                                                setPreparationsConfirmOpen(false);
                                            } finally {
                                                setPreparationsConfirmBusy(false);
                                            }
                                        })();
                                    }}
                                >
                                    {confirmBusy
                                        ? { de: 'Wird markiert…', en: 'Marking…' }[props.locale]
                                        : { de: 'Ja, als erledigt markieren', en: 'Yes, mark as done' }[props.locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
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
