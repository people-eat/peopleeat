import { formatCurrency } from '../../shared';
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
    bypassCookApproval: boolean;
    paymentStatus: AdminAmendmentPaymentStatus;
    totalCentsCustomerBefore: number;
    totalCentsCustomerAfter: number;
    payoutCentsCookBefore: number;
    payoutCentsCookAfter: number;
    busy?: boolean;
    onConfirm: () => void;
}) {
    const { locale } = props;
    const approvalLine = props.bypassCookApproval
        ? {
              de: 'Koch-Freigabe wird übersprungen. Änderung und Zahlung werden sofort angewendet.',
              en: 'Cook approval is bypassed. The change and payment effects apply immediately.',
          }[locale]
        : {
              de: 'Der Koch muss die Änderung noch annehmen, bevor Geld fließt.',
              en: 'The chef must still accept the change before money moves.',
          }[locale];

    return (
        <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Buchungsänderung bestätigen', en: 'Confirm booking change' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="grid gap-3 text-sm text-muted-foreground">
                            <p>{approvalLine}</p>
                            <p>
                                {
                                    {
                                        de: `Gastgeberpreis ${formatCurrency(props.totalCentsCustomerBefore, { locale })} → ${formatCurrency(props.totalCentsCustomerAfter, { locale })}. Koch-Auszahlung ${formatCurrency(props.payoutCentsCookBefore, { locale })} → ${formatCurrency(props.payoutCentsCookAfter, { locale })}.`,
                                        en: `Host price ${formatCurrency(props.totalCentsCustomerBefore, { locale })} → ${formatCurrency(props.totalCentsCustomerAfter, { locale })}. Cook payout ${formatCurrency(props.payoutCentsCookBefore, { locale })} → ${formatCurrency(props.payoutCentsCookAfter, { locale })}.`,
                                    }[locale]
                                }
                            </p>
                            <p>{paymentConsequenceCopy(props.paymentStatus, locale)}</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={props.busy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={props.busy}
                        onClick={(event) => {
                            event.preventDefault();
                            props.onConfirm();
                        }}
                    >
                        {props.busy
                            ? { de: 'Wird angewendet…', en: 'Applying…' }[locale]
                            : props.bypassCookApproval
                              ? { de: 'Sofort anwenden', en: 'Apply now' }[locale]
                              : { de: 'Beim Koch vorschlagen', en: 'Propose to chef' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
