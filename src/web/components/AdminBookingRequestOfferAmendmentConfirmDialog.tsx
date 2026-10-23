import { formatCurrency } from '../../shared';
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
        return {
            de: 'Checkout ist noch offen: die vorbereitete Stripe-Zahlung wird storniert und mit den neuen Beträgen neu vorbereitet.',
            en: 'Checkout is still open: the prepared Stripe payment will be canceled and re-prepared at the new amounts.',
        }[locale];
    }
    if (paymentStatus === 'SETUP') {
        return {
            de: 'Karte ist gespeichert: Angebotsbeträge werden aktualisiert; der spätere Lastschrift-Job zieht den neuen Betrag ein.',
            en: 'Card is saved: offer amounts update now; the later pull job charges the new total.',
        }[locale];
    }
    if (paymentStatus === 'PAYED') {
        return {
            de: 'Bereits bezahlt: es folgen automatische Erstattung oder Nachzahlung (ggf. Checkout für eine Delta-Zahlung).',
            en: 'Already paid: an automatic refund or top-up follows (checkout may be needed for a delta charge).',
        }[locale];
    }
    return {
        de: 'Zahlungsstatus wird berücksichtigt; Geldflüsse folgen den Amendment-Regeln.',
        en: 'Payment status is honored; money moves follow amendment rules.',
    }[locale];
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
                    <AlertDialogTitle>{{ de: 'Buchungsänderung bestätigen', en: 'Confirm booking change' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="grid gap-3 text-sm text-muted-foreground">
                            <p>
                                {
                                    {
                                        de: `Gastgeberpreis ${formatCurrency(props.totalCentsCustomerBefore, { locale })} → ${formatCurrency(props.totalCentsCustomerAfter, { locale })}. Koch-Auszahlung ${formatCurrency(props.payoutCentsCookBefore, { locale })} → ${formatCurrency(props.payoutCentsCookAfter, { locale })}.`,
                                        en: `Host price ${formatCurrency(props.totalCentsCustomerBefore, { locale })} → ${formatCurrency(props.totalCentsCustomerAfter, { locale })}. Cook payout ${formatCurrency(props.payoutCentsCookBefore, { locale })} → ${formatCurrency(props.payoutCentsCookAfter, { locale })}.`,
                                    }[locale]
                                }
                            </p>
                            <p>{paymentConsequenceCopy(props.paymentStatus, locale)}</p>
                            <p className="font-medium text-foreground">
                                {
                                    {
                                        de: 'Wie soll die Änderung angewendet werden?',
                                        en: 'How should this change be applied?',
                                    }[locale]
                                }
                            </p>
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
                        {props.busy
                            ? { de: 'Wird gespeichert…', en: 'Saving…' }[locale]
                            : { de: 'Beim Koch vorschlagen', en: 'Propose to chef' }[locale]}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={props.busy}
                        onClick={() => {
                            props.onConfirm(true);
                        }}
                    >
                        {
                            {
                                de: 'Sofort anwenden (ohne Koch-Freigabe)',
                                en: 'Apply now (skip cook approval)',
                            }[locale]
                        }
                    </Button>
                    <AlertDialogCancel disabled={props.busy} className="mt-0">
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
