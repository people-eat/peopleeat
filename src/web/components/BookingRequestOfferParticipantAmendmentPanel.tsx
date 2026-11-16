import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { t } from '../../i18n/t';
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
    claimedAt?: string | null;
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
            t(locale, 'common', 'amendment.menuChange', {
                before: formatCurrency(amendment.menuPriceCentsBefore, { locale }),
                after: formatCurrency(amendment.menuPriceCentsAfter, { locale }),
            }),
        );
    }
    if (amendment.travelExpensesCentsBefore !== amendment.travelExpensesCentsAfter) {
        parts.push(
            t(locale, 'common', 'amendment.travelChange', {
                before: formatCurrency(amendment.travelExpensesCentsBefore, { locale }),
                after: formatCurrency(amendment.travelExpensesCentsAfter, { locale }),
            }),
        );
    }
    return parts.join(' · ');
}

function customerPendingAmendmentBody(
    amendment: AmendmentPreview,
    locale: Locale,
    currentParticipants: { type: 'ADULT' | 'DISCOUNTED' }[],
): string {
    const changedParticipants = amendment.participants != null;
    const changedVenue = amendment.exactEventAddress != null;
    const confirmTail = t(locale, 'common', 'amendment.confirmTail');

    if (changedParticipants && amendment.participants) {
        const before = currentParticipants.length;
        const after = amendment.participants.length;
        const participantsClause = t(locale, 'common', 'amendment.participantsClause', { before, after });
        if (changedVenue) {
            return t(locale, 'common', 'amendment.changedParticipantsAndVenue', { participantsClause, confirmTail });
        }
        return t(locale, 'common', 'amendment.changedParticipants', { participantsClause, confirmTail });
    }

    if (changedVenue) {
        return t(locale, 'common', 'amendment.changedVenue', { confirmTail });
    }

    return confirmTail;
}

export function BookingRequestOfferParticipantAmendmentCustomerPanel(props: {
    locale: Locale;
    canRequest: boolean;
    preparationsCompletedAt: string | null;
    amendment: AmendmentPreview | null;
    /** Live booking participants (before the pending proposal). Used for customer pending copy. */
    currentParticipants?: { type: 'ADULT' | 'DISCOUNTED' }[];
    bookingRequestId: string;
    onCancelAmendment?: () => Promise<void>;
    cancelBusy?: boolean;
}) {
    const enabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_AMENDMENT');

    if (!enabled && !props.amendment && !props.preparationsCompletedAt) return null;

    if (props.amendment) {
        const claimed = props.amendment.claimedAt != null;
        return (
            <StatusAlert
                tone="info"
                title={t(props.locale, 'common', claimed ? 'amendment.applying' : 'amendment.requested')}
                action={
                    !claimed && props.onCancelAmendment ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={props.cancelBusy}
                            onClick={() => void props.onCancelAmendment?.()}
                        >
                            {t(props.locale, 'common', 'amendment.withdrawChange')}
                        </Button>
                    ) : undefined
                }
            >
                {claimed
                    ? t(props.locale, 'common', 'amendment.chefAcceptedApply', {
                          summary: amendmentSummary(props.amendment, props.locale),
                          price: formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale }),
                      })
                    : customerPendingAmendmentBody(props.amendment, props.locale, props.currentParticipants ?? [])}
            </StatusAlert>
        );
    }

    if (props.preparationsCompletedAt) {
        return (
            <StatusAlert tone="info" title={t(props.locale, 'common', 'amendment.shoppingCompleted')}>
                {t(props.locale, 'common', 'amendment.shoppingLocked')}
            </StatusAlert>
        );
    }

    if (!enabled || !props.canRequest) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t(props.locale, 'common', 'amendment.changeAfterAccept')}</p>
            <Button type="button" variant="outline" size="sm" asChild>
                <Link
                    to="/{-$locale}/profile/booking-requests/$bookingRequestId/edit"
                    params={{ bookingRequestId: props.bookingRequestId }}
                >
                    {t(props.locale, 'common', 'amendment.changeBooking')}
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
    const claimed = props.amendment.claimedAt != null;
    const giftNote =
        props.amendment.giftCardDeltaCents < 0
            ? t(props.locale, 'common', 'amendment.giftCardRestored', {
                  amount: formatCurrency(Math.abs(props.amendment.giftCardDeltaCents), { locale: props.locale }),
              })
            : '';
    return (
        <StatusAlert
            tone="warning"
            title={t(props.locale, 'common', claimed ? 'amendment.applying' : 'amendment.reviewChange')}
            action={
                showActions ? (
                    <div className="flex flex-wrap gap-2">
                        {!claimed ? (
                            <Button type="button" size="sm" variant="outline" disabled={props.busy} onClick={() => void props.onDecline()}>
                                {t(props.locale, 'common', 'decline')}
                            </Button>
                        ) : null}
                        <Button type="button" size="sm" disabled={props.busy} onClick={() => void props.onAccept()}>
                            {t(props.locale, 'common', claimed ? 'amendment.retry' : 'amendment.acceptChange')}
                        </Button>
                    </div>
                ) : undefined
            }
        >
            {claimed
                ? t(props.locale, 'common', 'amendment.acceptanceRunning', {
                      summary: amendmentSummary(props.amendment, props.locale),
                  })
                : t(props.locale, 'common', 'amendment.payoutLine', {
                      summary: amendmentSummary(props.amendment, props.locale),
                      before: formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale }),
                      after: formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale }),
                      giftNote,
                  })}
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
                <StatusAlert tone="success" title={t(props.locale, 'common', 'amendment.shoppingPrepDone')}>
                    {t(props.locale, 'common', 'amendment.furtherChangesLocked')}
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
                        {t(props.locale, 'common', 'amendment.markShoppingDone')}
                    </Button>
                    <AlertDialog open={preparationsConfirmOpen} onOpenChange={setPreparationsConfirmOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t(props.locale, 'common', 'amendment.markShoppingConfirmTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t(props.locale, 'common', 'amendment.markShoppingConfirmBody')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={confirmBusy}>{t(props.locale, 'common', 'cancel')}</AlertDialogCancel>
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
                                    {t(props.locale, 'common', 'amendment.yesDone')}
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
    const claimed = props.amendment.claimedAt != null;
    const priceLine = t(props.locale, 'common', 'amendment.hostCookPriceLine', {
        hostBefore: formatCurrency(props.amendment.totalCentsCustomerBefore, { locale: props.locale }),
        hostAfter: formatCurrency(props.amendment.totalCentsCustomerAfter, { locale: props.locale }),
        cookBefore: formatCurrency(props.amendment.payoutCentsCookBefore, { locale: props.locale }),
        cookAfter: formatCurrency(props.amendment.payoutCentsCookAfter, { locale: props.locale }),
    });

    return (
        <StatusAlert
            tone="warning"
            title={t(props.locale, 'common', claimed ? 'amendment.applyingBookingChange' : 'amendment.pendingBookingChange')}
            action={props.action}
        >
            <span className="grid gap-1">
                <span>
                    {claimed
                        ? t(props.locale, 'common', 'amendment.chefAcceptedApplyRunning', {
                              summarySuffix: summary ? `: ${summary}` : '',
                          })
                        : t(props.locale, 'common', 'amendment.waitingOnChef', {
                              summarySuffix: summary ? `: ${summary}` : '',
                          })}
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
                    title={t(props.locale, 'common', 'amendment.preparationsLocked')}
                    action={
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={props.busy}
                            onClick={() => void props.onClearPreparations()}
                        >
                            {t(props.locale, 'common', 'amendment.clearLock')}
                        </Button>
                    }
                >
                    {t(props.locale, 'common', 'amendment.chefMarkedDone')}
                </StatusAlert>
            ) : null}
        </div>
    );
}
