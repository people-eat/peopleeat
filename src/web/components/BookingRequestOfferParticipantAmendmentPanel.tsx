import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
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
    participants: { type: 'ADULT' | 'DISCOUNTED'; name: string; restrictions: string[] }[] | null;
    exactEventAddress: { displayText: string; city: string } | null;
    menuPriceCentsBefore: number;
    menuPriceCentsAfter: number;
    travelExpensesCentsBefore: number;
    travelExpensesCentsAfter: number;
    totalCentsCustomerBefore: number;
    totalCentsCustomerAfter: number;
    payoutCentsCookBefore: number;
    payoutCentsCookAfter: number;
    giftCardDeltaCents: number;
};

function amendmentSummary(amendment: AmendmentPreview, locale: Locale): string {
    const parts: string[] = [];
    if (amendment.participants) {
        const adults = amendment.participants.filter((p) => p.type === 'ADULT').length;
        const discounted = amendment.participants.filter((p) => p.type === 'DISCOUNTED').length;
        parts.push(formatParticipants({ adultCount: adults, discountedCount: discounted }, { locale }));
    }
    if (amendment.exactEventAddress) {
        parts.push(amendment.exactEventAddress.displayText || amendment.exactEventAddress.city);
    }
    if (amendment.menuPriceCentsBefore !== amendment.menuPriceCentsAfter) {
        parts.push(
            {
                de: `Menü ${formatCurrency(amendment.menuPriceCentsBefore, { locale })} → ${formatCurrency(amendment.menuPriceCentsAfter, { locale })}`,
                en: `Menu ${formatCurrency(amendment.menuPriceCentsBefore, { locale })} → ${formatCurrency(amendment.menuPriceCentsAfter, { locale })}`,
            }[locale],
        );
    }
    if (amendment.travelExpensesCentsBefore !== amendment.travelExpensesCentsAfter) {
        parts.push(
            {
                de: `Reise ${formatCurrency(amendment.travelExpensesCentsBefore, { locale })} → ${formatCurrency(amendment.travelExpensesCentsAfter, { locale })}`,
                en: `Travel ${formatCurrency(amendment.travelExpensesCentsBefore, { locale })} → ${formatCurrency(amendment.travelExpensesCentsAfter, { locale })}`,
            }[locale],
        );
    }
    return parts.join(' · ');
}

export function BookingRequestOfferParticipantAmendmentCustomerPanel(props: {
    locale: Locale;
    canRequest: boolean;
    preparationsCompletedAt: string | null;
    amendment: AmendmentPreview | null;
    bookingRequestId: string;
    onCancelAmendment?: () => Promise<void>;
    cancelBusy?: boolean;
}) {
    const enabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_AMENDMENT');

    if (!enabled && !props.amendment && !props.preparationsCompletedAt) return null;

    if (props.amendment) {
        return (
            <StatusAlert
                tone="info"
                title={{ de: 'Änderung vorgeschlagen', en: 'Change proposed' }[props.locale]}
                action={
                    props.onCancelAmendment ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={props.cancelBusy}
                            onClick={() => void props.onCancelAmendment?.()}
                        >
                            {{ de: 'Zurückziehen', en: 'Withdraw' }[props.locale]}
                        </Button>
                    ) : undefined
                }
            >
                {
                    {
                        de: `Dein Vorschlag (${amendmentSummary(props.amendment, props.locale)}) wartet auf die Bestätigung des Kochs. Neuer Gastgeberpreis: ${formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale })}.`,
                        en: `Your proposal (${amendmentSummary(props.amendment, props.locale)}) is waiting for the chef to confirm. New host price: ${formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale })}.`,
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
                        de: 'Dein Koch hat den Einkauf bzw. die Vorbereitung bereits erledigt. Teilnehmerzahl und Ort können nicht mehr geändert werden.',
                        en: 'Your chef has already completed grocery shopping or preparations. Participants and venue can no longer be changed.',
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
                        de: 'Du möchtest Teilnehmerzahl oder Ort nach der Annahme ändern? Nutze die Bearbeitung der Anfrage.',
                        en: 'Need to change participants or venue after accepting? Use Edit on the booking request.',
                    }[props.locale]
                }
            </p>
            <Button type="button" variant="outline" size="sm" asChild>
                <Link
                    to="/{-$locale}/profile/booking-requests/$bookingRequestId/edit"
                    params={{ bookingRequestId: props.bookingRequestId }}
                >
                    {{ de: 'Buchung ändern', en: 'Change booking' }[props.locale]}
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
    const giftNote =
        props.amendment.giftCardDeltaCents < 0
            ? {
                  de: ` Geschenkkarte ${formatCurrency(Math.abs(props.amendment.giftCardDeltaCents), { locale: props.locale })} zurück.`,
                  en: ` Gift card ${formatCurrency(Math.abs(props.amendment.giftCardDeltaCents), { locale: props.locale })} restored.`,
              }[props.locale]
            : '';
    return (
        <StatusAlert
            tone="warning"
            title={{ de: 'Buchungsänderung prüfen', en: 'Review booking change' }[props.locale]}
            action={
                showActions ? (
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={props.busy} onClick={() => void props.onDecline()}>
                            {{ de: 'Ablehnen', en: 'Decline' }[props.locale]}
                        </Button>
                        <Button type="button" size="sm" disabled={props.busy} onClick={() => void props.onAccept()}>
                            {{ de: 'Änderung annehmen', en: 'Accept change' }[props.locale]}
                        </Button>
                    </div>
                ) : undefined
            }
        >
            {
                {
                    de: `${amendmentSummary(props.amendment, props.locale)}. Auszahlung ${formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale })}. Die Buchung bleibt bestätigt; Zahlung oder Erstattung folgen automatisch nach deiner Entscheidung.${giftNote}`,
                    en: `${amendmentSummary(props.amendment, props.locale)}. Payout ${formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale })}. The booking stays confirmed; charge or refund runs automatically after you decide.${giftNote}`,
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
    const preparationsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PREPARATIONS_COMPLETE');
    const [preparationsConfirmOpen, setPreparationsConfirmOpen] = useState(false);
    const [preparationsConfirmBusy, setPreparationsConfirmBusy] = useState(false);

    // Pending amendments stay visible even when the preparations rollout toggle is off.
    if (!props.amendment && !preparationsEnabled && !props.preparationsCompletedAt) return null;
    if (!props.amendment && !props.preparationsCompletedAt && !props.canCompletePreparations) return null;

    const confirmBusy = preparationsConfirmBusy || props.busy;
    const showPrep = preparationsEnabled || props.preparationsCompletedAt != null;

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
                    title={{ de: 'Einkauf / Vorbereitung erledigt', en: 'Shopping / preparations done' }[props.locale]}
                >
                    {
                        {
                            de: 'Weitere Kundenänderungen an Teilnehmerzahl oder Ort sind gesperrt.',
                            en: 'Further customer changes to participants or venue are locked.',
                        }[props.locale]
                    }
                </StatusAlert>
            ) : null}

            {showPrep && !props.preparationsCompletedAt && props.canCompletePreparations ? (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={props.busy}
                        onClick={() => setPreparationsConfirmOpen(true)}
                    >
                        {{ de: 'Einkauf / Vorbereitung erledigt', en: 'Mark shopping / prep done' }[props.locale]}
                    </Button>
                    <AlertDialog open={preparationsConfirmOpen} onOpenChange={setPreparationsConfirmOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {{ de: 'Einkauf wirklich als erledigt markieren?', en: 'Mark shopping as done?' }[props.locale]}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Danach kann der Gastgeber Teilnehmerzahl und Ort nicht mehr ändern.',
                                            en: 'Afterwards the host can no longer change participants or venue.',
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
                                        setPreparationsConfirmBusy(true);
                                        void props.onPreparationsComplete().finally(() => {
                                            setPreparationsConfirmBusy(false);
                                            setPreparationsConfirmOpen(false);
                                        });
                                    }}
                                >
                                    {{ de: 'Ja, erledigt', en: 'Yes, done' }[props.locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            ) : null}
        </div>
    );
}

/** Pending amendment notice for admin readonly / edit surfaces. */
export function BookingRequestOfferParticipantAmendmentAdminPendingAlert(props: {
    locale: Locale;
    amendment: AmendmentPreview;
    /** Extra sentence after the summary (e.g. save will replace the proposal). */
    footnote?: string;
    action?: ReactNode;
}) {
    const summary = amendmentSummary(props.amendment, props.locale);
    const priceLine = {
        de: `Gastgeberpreis ${formatCurrency(props.amendment.totalCentsCustomerBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale })}. Koch-Auszahlung ${formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale })}.`,
        en: `Host price ${formatCurrency(props.amendment.totalCentsCustomerBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale })}. Cook payout ${formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale })} → ${formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale })}.`,
    }[props.locale];

    return (
        <StatusAlert
            tone="warning"
            title={{ de: 'Offene Buchungsänderung', en: 'Pending booking change' }[props.locale]}
            action={props.action}
        >
            <span className="grid gap-1">
                <span>
                    {
                        {
                            de: `Vorschlag wartet auf den Koch${summary ? `: ${summary}` : ''}.`,
                            en: `Proposal waiting on the chef${summary ? `: ${summary}` : ''}.`,
                        }[props.locale]
                    }
                </span>
                <span>{priceLine}</span>
                {props.footnote ? <span>{props.footnote}</span> : null}
            </span>
        </StatusAlert>
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
                <BookingRequestOfferParticipantAmendmentAdminPendingAlert locale={props.locale} amendment={props.amendment} />
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
                            de: 'Der Koch hat Einkauf / Vorbereitung als erledigt markiert.',
                            en: 'The chef marked shopping / preparations as done.',
                        }[props.locale]
                    }
                </StatusAlert>
            ) : null}
        </div>
    );
}
