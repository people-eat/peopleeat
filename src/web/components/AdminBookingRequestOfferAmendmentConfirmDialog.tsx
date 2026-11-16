import { t } from '../../i18n/t';
import { formatCurrency, inlineCopy } from '../../shared';
import type { Locale } from '../utils/locale';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';
import { Button } from './base/button';

export type AdminAmendmentPaymentStatus = 'EMPTY' | 'SETUP' | 'PAYED' | string;

function paymentConsequenceCopy(paymentStatus: AdminAmendmentPaymentStatus, locale: Locale): string {
    if (paymentStatus === 'EMPTY') {
        return t(locale, 'admin', 'copy.checkoutIsStillOpenThePreparedStripePaymentWillBeCanceledAnd');
    }
    if (paymentStatus === 'SETUP') {
        return t(locale, 'admin', 'copy.cardIsSavedOfferAmountsUpdateNowTheLaterPullJobChargesTheNew');
    }
    if (paymentStatus === 'PAYED') {
        return t(locale, 'admin', 'copy.alreadyPaidAnAutomaticRefundOrTopUpFollowsCheckoutMayBeNeede');
    }
    return t(locale, 'admin', 'copy.paymentStatusIsHonoredMoneyMovesFollowAmendmentRules');
}

export function AdminBookingRequestOfferAmendmentConfirmDialog(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    locale: Locale;
    paymentStatus: AdminAmendmentPaymentStatus;
    totalCentsCustomerBefore: number;
    totalCentsCustomerAfter: number;
    payoutCentsCookBefore: number;
    payoutCentsCookAfter: number;
    busy?: boolean;
    /** `bypassCookApproval` is chosen explicitly via the dialog actions. */
    onConfirm: (bypassCookApproval: boolean) => void;
}) {
    const { locale } = props;

    return (
        <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t(locale, 'admin', 'copy.confirmBookingChange')}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="grid gap-3 text-sm text-muted-foreground">
                            <p>
                                {inlineCopy(
                                    {
                                        de: `Gastgeberpreis ${formatCurrency(props.totalCentsCustomerBefore, { locale })} → ${formatCurrency(props.totalCentsCustomerAfter, { locale })}. Koch-Auszahlung ${formatCurrency(props.payoutCentsCookBefore, { locale })} → ${formatCurrency(props.payoutCentsCookAfter, { locale })}.`,
                                        en: `Host price ${formatCurrency(props.totalCentsCustomerBefore, { locale })} → ${formatCurrency(props.totalCentsCustomerAfter, { locale })}. Cook payout ${formatCurrency(props.payoutCentsCookBefore, { locale })} → ${formatCurrency(props.payoutCentsCookAfter, { locale })}.`,
                                    },
                                    locale,
                                )}
                            </p>
                            <p>{paymentConsequenceCopy(props.paymentStatus, locale)}</p>
                            <p className="font-medium text-foreground">{t(locale, 'admin', 'copy.howShouldThisChangeBeApplied')}</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                    <Button
                        type="button"
                        disabled={props.busy}
                        onClick={() => {
                            props.onConfirm(false);
                        }}
                    >
                        {props.busy ? t(locale, 'admin', 'copy.saving') : t(locale, 'admin', 'copy.proposeToChef')}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={props.busy}
                        onClick={() => {
                            props.onConfirm(true);
                        }}
                    >
                        {t(locale, 'admin', 'copy.applyNowSkipCookApproval')}
                    </Button>
                    <AlertDialogCancel disabled={props.busy} className="mt-0">
                        {t(locale, 'admin', 'copy.cancel')}
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
