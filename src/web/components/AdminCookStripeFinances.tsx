import { formatCurrency, formatDate } from '../../shared';
import {
    cookStripeAccountDetailsCategories,
    cookStripeAccountDetailsHasActionableContent,
    cookStripeAccountDetailsTitle,
    cookStripeAccountDetailsTone,
    cookStripeBalanceTransactionKindLabel,
    cookStripeBalanceTransactionStatusLabel,
    cookStripeDisabledReasonLabel,
    cookStripeRequirementCategoryLabel,
    cookStripeStatusDescription,
    cookStripeStatusLabel,
    cookStripeStatusTone,
} from '../../shared/cookStripe';
import type { GqlCCookStripeAccountDetails, GqlCCookStripeStatus, GqlCCookStripeWallet } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { StatusAlert } from './base/status-alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './base/table';

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
        stripeAccountDetails != null && cookStripeAccountDetailsHasActionableContent(stripeAccountDetails, stripeStatus)
            ? {
                  details: stripeAccountDetails,
                  categories: cookStripeAccountDetailsCategories(stripeAccountDetails),
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

            <StatusAlert tone={cookStripeStatusTone(stripeStatus)} title={cookStripeStatusLabel(stripeStatus, locale)}>
                {cookStripeStatusDescription(stripeStatus, locale, 'admin')}
            </StatusAlert>

            {detailsChecklist ? (
                <StatusAlert
                    tone={cookStripeAccountDetailsTone(detailsChecklist.details)}
                    title={cookStripeAccountDetailsTitle(detailsChecklist.details, locale)}
                >
                    <div className="grid gap-2">
                        {detailsChecklist.details.disabledReason != null ? (
                            <p>{cookStripeDisabledReasonLabel(detailsChecklist.details.disabledReason, locale, 'admin')}</p>
                        ) : null}
                        {detailsChecklist.categories.length > 0 ? (
                            <ul className="list-disc pl-5">
                                {detailsChecklist.categories.map((category) => (
                                    <li key={category}>{cookStripeRequirementCategoryLabel(category, locale)}</li>
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
                                                    <span>{cookStripeBalanceTransactionKindLabel(txn.kind, locale)}</span>
                                                    {txn.description ? (
                                                        <span className="text-xs text-muted-foreground">{txn.description}</span>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>{cookStripeBalanceTransactionStatusLabel(txn.status, locale)}</TableCell>
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
