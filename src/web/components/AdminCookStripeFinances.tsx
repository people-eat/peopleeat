import { formatCurrency, formatDate } from '../../shared';
import type {
    GqlCCookStripeAccountDetails,
    GqlCCookStripeBalanceTransactionKind,
    GqlCCookStripeBalanceTransactionStatus,
    GqlCCookStripeDisabledReason,
    GqlCCookStripeRequirementCategory,
    GqlCCookStripeStatus,
    GqlCCookStripeWallet,
} from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import type { StatusTone } from './base/status';
import { StatusAlert } from './base/status-alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './base/table';

function stripeStatusLabel(status: GqlCCookStripeStatus, locale: Locale): string {
    return {
        EMPTY: { de: 'Noch nicht eingerichtet', en: 'Not set up yet' },
        PREPARED: { de: 'Einrichtung unvollständig', en: 'Setup incomplete' },
        COMPLETED: { de: 'Bereit für Auszahlungen', en: 'Ready for payouts' },
        ACTIVE_WAS_RESET: { de: 'Aktualisierung erforderlich', en: 'Update required' },
    }[status][locale];
}

function stripeStatusTone(status: GqlCCookStripeStatus): StatusTone {
    const tones = {
        EMPTY: 'info',
        PREPARED: 'warning',
        COMPLETED: 'success',
        ACTIVE_WAS_RESET: 'warning',
    } as const satisfies Record<GqlCCookStripeStatus, StatusTone>;
    return tones[status];
}

function stripeStatusDescription(status: GqlCCookStripeStatus, locale: Locale): string {
    return {
        EMPTY: {
            de: 'Kein Stripe-Konto eingerichtet. Auszahlungen sind nicht möglich.',
            en: 'No Stripe account set up. Payouts are not possible.',
        },
        PREPARED: {
            de: 'Die Wallet-Einrichtung ist noch nicht abgeschlossen.',
            en: 'Wallet setup is not finished yet.',
        },
        COMPLETED: {
            de: 'Wallet ist verbunden. Bankauszahlungen löst das Team nach dem Event aus.',
            en: 'Wallet is connected. Bank payouts are released by the team after the event.',
        },
        ACTIVE_WAS_RESET: {
            de: 'Stripe benötigt aktualisierte Angaben, bevor Auszahlungen weiterlaufen.',
            en: 'Stripe needs updated details before payouts can continue.',
        },
    }[status][locale];
}

function requirementCategoryLabel(category: GqlCCookStripeRequirementCategory, locale: Locale): string {
    return {
        IDENTITY_VERIFICATION: { de: 'Identitätsprüfung', en: 'Identity verification' },
        BANK_ACCOUNT: { de: 'Bankkonto', en: 'Bank account' },
        TERMS_OF_SERVICE: { de: 'Nutzungsbedingungen', en: 'Terms of service' },
        BUSINESS_DETAILS: { de: 'Geschäftsangaben', en: 'Business details' },
        PERSONAL_DETAILS: { de: 'Persönliche Angaben', en: 'Personal details' },
        OTHER: { de: 'Weitere Angaben', en: 'Additional details' },
    }[category][locale];
}

function disabledReasonLabel(reason: GqlCCookStripeDisabledReason, locale: Locale): string {
    return {
        PAST_DUE: {
            de: 'Pflichtangaben sind überfällig.',
            en: 'Required details are overdue.',
        },
        PENDING_VERIFICATION: {
            de: 'Stripe prüft gerade die Unterlagen.',
            en: 'Stripe is reviewing the documents.',
        },
        REJECTED: {
            de: 'Stripe hat die Freigabe abgelehnt.',
            en: 'Stripe rejected the account.',
        },
        LISTED: {
            de: 'Das Stripe-Konto ist vorübergehend eingeschränkt.',
            en: 'The Stripe account is temporarily restricted.',
        },
        OTHER: {
            de: 'Stripe hat das Konto vorübergehend eingeschränkt.',
            en: 'Stripe has temporarily restricted the account.',
        },
    }[reason][locale];
}

function uniqueCategories(...lists: readonly (readonly GqlCCookStripeRequirementCategory[])[]): GqlCCookStripeRequirementCategory[] {
    const seen = new Set<GqlCCookStripeRequirementCategory>();
    const out: GqlCCookStripeRequirementCategory[] = [];
    for (const list of lists) {
        for (const category of list) {
            if (seen.has(category)) continue;
            seen.add(category);
            out.push(category);
        }
    }
    return out;
}

function stripeDetailsTone(details: GqlCCookStripeAccountDetails): StatusTone {
    if (
        details.pastDue.length > 0 ||
        details.disabledReason === 'PAST_DUE' ||
        details.disabledReason === 'REJECTED' ||
        details.disabledReason === 'LISTED'
    ) {
        return 'error';
    }
    if (details.pendingVerification.length > 0 && details.currentlyDue.length === 0 && details.disabledReason !== 'OTHER') {
        return 'info';
    }
    return 'warning';
}

function stripeDetailsTitle(details: GqlCCookStripeAccountDetails, locale: Locale): string {
    if (details.pastDue.length > 0 || details.disabledReason === 'PAST_DUE') {
        return { de: 'Angaben überfällig', en: 'Details overdue' }[locale];
    }
    if (details.disabledReason === 'REJECTED') {
        return { de: 'Freigabe abgelehnt', en: 'Account rejected' }[locale];
    }
    if (details.disabledReason === 'LISTED') {
        return { de: 'Konto eingeschränkt', en: 'Account restricted' }[locale];
    }
    if (details.pendingVerification.length > 0 && details.currentlyDue.length === 0) {
        return { de: 'Prüfung läuft', en: 'Review in progress' }[locale];
    }
    return { de: 'Noch offen bei Stripe', en: 'Still needed in Stripe' }[locale];
}

function stripeDetailsHasActionableContent(details: GqlCCookStripeAccountDetails, status: GqlCCookStripeStatus): boolean {
    if (details.pastDue.length > 0 || details.currentlyDue.length > 0 || details.pendingVerification.length > 0) {
        return true;
    }
    if (details.disabledReason != null) {
        return true;
    }
    if (status !== 'COMPLETED' && details.detailsSubmitted && (!details.chargesEnabled || !details.payoutsEnabled)) {
        return true;
    }
    return false;
}

function balanceTransactionKindLabel(kind: GqlCCookStripeBalanceTransactionKind, locale: Locale): string {
    return {
        PAYMENT: { de: 'Zahlung', en: 'Payment' },
        PAYOUT: { de: 'Auszahlung', en: 'Payout' },
        TRANSFER: { de: 'Transfer', en: 'Transfer' },
        FEE: { de: 'Gebühr', en: 'Fee' },
        ADJUSTMENT: { de: 'Anpassung', en: 'Adjustment' },
        OTHER: { de: 'Sonstiges', en: 'Other' },
    }[kind][locale];
}

function balanceTransactionStatusLabel(status: GqlCCookStripeBalanceTransactionStatus, locale: Locale): string {
    return {
        AVAILABLE: { de: 'Verfügbar', en: 'Available' },
        PENDING: { de: 'Ausstehend', en: 'Pending' },
    }[status][locale];
}

/** Live Stripe requirements + Connect balance for the admin cook-profile tab. */
export function AdminCookStripeFinances({
    stripeStatus,
    stripeAccountDetails,
    stripeWallet,
}: {
    stripeStatus: GqlCCookStripeStatus;
    stripeAccountDetails: GqlCCookStripeAccountDetails | null | undefined;
    stripeWallet: GqlCCookStripeWallet | null | undefined;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    const detailsChecklist =
        stripeAccountDetails != null && stripeDetailsHasActionableContent(stripeAccountDetails, stripeStatus)
            ? {
                  details: stripeAccountDetails,
                  categories: uniqueCategories(
                      stripeAccountDetails.pastDue,
                      stripeAccountDetails.currentlyDue,
                      stripeAccountDetails.pendingVerification,
                  ),
              }
            : null;

    return (
        <section className="grid gap-6" aria-labelledby="admin-cook-finances-heading">
            <div className="grid gap-2">
                <h2 id="admin-cook-finances-heading" className="font-serif text-2xl/tight text-foreground">
                    {{ de: 'Finanzen', en: 'Finances' }[locale]}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Live-Daten von Stripe. Unabhängig vom Koch-Feature-Toggle für das Wallet-Guthaben.',
                            en: 'Live data from Stripe. Independent of the cook feature toggle for wallet balance.',
                        }[locale]
                    }
                </p>
            </div>

            <StatusAlert tone={stripeStatusTone(stripeStatus)} title={stripeStatusLabel(stripeStatus, locale)}>
                {stripeStatusDescription(stripeStatus, locale)}
            </StatusAlert>

            {detailsChecklist ? (
                <StatusAlert
                    tone={stripeDetailsTone(detailsChecklist.details)}
                    title={stripeDetailsTitle(detailsChecklist.details, locale)}
                >
                    <div className="grid gap-2">
                        {detailsChecklist.details.disabledReason != null ? (
                            <p>{disabledReasonLabel(detailsChecklist.details.disabledReason, locale)}</p>
                        ) : null}
                        {detailsChecklist.categories.length > 0 ? (
                            <ul className="list-disc pl-5">
                                {detailsChecklist.categories.map((category) => (
                                    <li key={category}>{requirementCategoryLabel(category, locale)}</li>
                                ))}
                            </ul>
                        ) : null}
                        {detailsChecklist.details.pendingVerification.length > 0 &&
                        detailsChecklist.details.currentlyDue.length === 0 &&
                        detailsChecklist.details.pastDue.length === 0 ? (
                            <p>
                                {
                                    {
                                        de: 'Der Koch muss gerade nichts weiter tun. Status aktualisiert sich, sobald Stripe fertig ist.',
                                        en: 'Nothing more for the cook to do right now. Status updates once Stripe finishes.',
                                    }[locale]
                                }
                            </p>
                        ) : null}
                        {detailsChecklist.details.detailsSubmitted &&
                        (!detailsChecklist.details.chargesEnabled || !detailsChecklist.details.payoutsEnabled) &&
                        stripeStatus !== 'COMPLETED' ? (
                            <p>
                                {
                                    {
                                        de: 'Zahlungen oder Auszahlungen sind bei Stripe noch nicht freigeschaltet.',
                                        en: 'Charges or payouts are not enabled on Stripe yet.',
                                    }[locale]
                                }
                            </p>
                        ) : null}
                    </div>
                </StatusAlert>
            ) : null}

            {stripeWallet != null ? (
                <div className="grid gap-6">
                    <div className="grid gap-3">
                        <h3 className="text-sm font-medium text-foreground">{{ de: 'Guthaben', en: 'Balance' }[locale]}</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1">
                                <p className="text-sm text-muted-foreground">{{ de: 'Verfügbar', en: 'Available' }[locale]}</p>
                                <p className="text-3xl/tight font-semibold tabular-nums text-foreground">
                                    {formatCurrency(stripeWallet.availableCents, { locale })}
                                </p>
                            </div>
                            <div className="grid gap-1">
                                <p className="text-sm text-muted-foreground">{{ de: 'Ausstehend', en: 'Pending' }[locale]}</p>
                                <p className="text-3xl/tight font-semibold tabular-nums text-foreground">
                                    {formatCurrency(stripeWallet.pendingCents, { locale })}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Verfügbar bedeutet bereit für die Bankauszahlung. Ausstehend wird nach der Stripe-Frist freigegeben.',
                                    en: 'Available means ready for bank payout. Pending clears after the Stripe hold period.',
                                }[locale]
                            }
                        </p>
                    </div>

                    <div className="grid gap-3">
                        <h3 className="text-sm font-medium text-foreground">
                            {{ de: 'Letzte Bewegungen', en: 'Recent activity' }[locale]}
                        </h3>
                        {stripeWallet.transactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Noch keine Bewegungen.',
                                        en: 'No activity yet.',
                                    }[locale]
                                }
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{{ de: 'Datum', en: 'Date' }[locale]}</TableHead>
                                        <TableHead>{{ de: 'Art', en: 'Type' }[locale]}</TableHead>
                                        <TableHead>{{ de: 'Status', en: 'Status' }[locale]}</TableHead>
                                        <TableHead className="text-right">{{ de: 'Betrag', en: 'Amount' }[locale]}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stripeWallet.transactions.map((txn) => (
                                        <TableRow key={txn.balanceTransactionId}>
                                            <TableCell>{formatDate(txn.createdAt, { locale, timeZone, dateStyle: 'medium' })}</TableCell>
                                            <TableCell>
                                                <div className="grid gap-0.5">
                                                    <span>{balanceTransactionKindLabel(txn.kind, locale)}</span>
                                                    {txn.description ? (
                                                        <span className="text-xs text-muted-foreground">{txn.description}</span>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>{balanceTransactionStatusLabel(txn.status, locale)}</TableCell>
                                            <TableCell
                                                className={cn(
                                                    'text-right tabular-nums',
                                                    txn.netCents < 0 ? 'text-destructive' : 'text-foreground',
                                                )}
                                            >
                                                {formatCurrency(txn.netCents, { locale })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            ) : stripeStatus !== 'EMPTY' ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Guthaben konnte nicht geladen werden (kein Konto oder Stripe-Fehler).',
                            en: 'Balance could not be loaded (no account or Stripe error).',
                        }[locale]
                    }
                </p>
            ) : null}
        </section>
    );
}
