import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useClient, useMutation } from 'urql';

import { formatCurrency, formatDate } from '../../../shared';
import { Button } from '../../components/base/button';
import type { StatusTone } from '../../components/base/status';
import { StatusAlert } from '../../components/base/status-alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import type {
    GqlCCookStripeAccountDetails,
    GqlCCookStripeBalanceTransactionKind,
    GqlCCookStripeBalanceTransactionStatus,
    GqlCCookStripeDisabledReason,
    GqlCCookStripeRequirementCategory,
    GqlCCookStripeStatus,
    GqlCCookStripeWallet,
    GqlCProfileCookWalletPageQuery,
} from '../../graphql/generated';
import {
    ProfileCookStripeDashboardUrlCreateDocument,
    ProfileCookStripeOnboardingStartDocument,
    ProfileCookStripeStatusSyncDocument,
    ProfileCookWalletPageUpdatesDocument,
    ProfileCookWalletStripeDetailsDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { webPageUrlGet } from '../../seo/webPageUrlGet';
import { cn } from '../../utils/cn';
import { DEFAULT_LOCALE } from '../../utils/locale';
import type { Locale } from '../../utils/locale';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('wallet');
export const profileCookWalletPageTitle = route.title;
export const profileCookWalletPageDescription = route.description;

export type ProfileWalletSearch = {
    stripeReturn?: true;
    stripeRefresh?: true;
};

export function parseProfileWalletSearch(search: Record<string, unknown>): ProfileWalletSearch {
    return {
        stripeReturn: search.stripeReturn === '1' || search.stripeReturn === true ? true : undefined,
        stripeRefresh: search.stripeRefresh === '1' || search.stripeRefresh === true ? true : undefined,
    };
}

function walletUrls(locale: Locale): { returnUrl: string; refreshUrl: string } {
    const origin = webPageUrlGet();
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    const base = `${origin}${prefix}/profile/wallet`;
    return {
        returnUrl: `${base}?stripeReturn=1`,
        refreshUrl: `${base}?stripeRefresh=1`,
    };
}

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
            de: 'Richte dein Stripe-Konto ein, damit Auszahlungen an dich möglich sind.',
            en: 'Set up your Stripe account so payouts can reach you.',
        },
        PREPARED: {
            de: 'Die Wallet-Einrichtung ist noch nicht abgeschlossen. Bitte fahre fort, um Auszahlungen zu aktivieren.',
            en: 'Wallet setup is not finished yet. Continue to enable payouts.',
        },
        COMPLETED: {
            de: 'Dein Wallet ist verbunden. Auszahlungen auf dein Bankkonto löst unser Team nach dem Event aus.',
            en: 'Your wallet is connected. Bank payouts are released by our team after the event.',
        },
        ACTIVE_WAS_RESET: {
            de: 'Stripe benötigt aktualisierte Angaben. Bitte aktualisiere dein Wallet, bevor Auszahlungen weiterlaufen.',
            en: 'Stripe needs updated details. Please refresh your wallet before payouts can continue.',
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
            de: 'Pflichtangaben sind überfällig. Bitte vervollständige sie in Stripe.',
            en: 'Required details are overdue. Please complete them in Stripe.',
        },
        PENDING_VERIFICATION: {
            de: 'Stripe prüft gerade deine Unterlagen.',
            en: 'Stripe is reviewing your documents.',
        },
        REJECTED: {
            de: 'Stripe hat die Freigabe abgelehnt. Bitte aktualisiere deine Angaben oder kontaktiere den Support.',
            en: 'Stripe rejected the account. Please update your details or contact support.',
        },
        LISTED: {
            de: 'Dein Stripe-Konto ist vorübergehend eingeschränkt.',
            en: 'Your Stripe account is temporarily restricted.',
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

export function ProfileCookWalletPage({ data, search }: { data: GqlCProfileCookWalletPageQuery; search: ProfileWalletSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const walletBalanceEnabled = useFeatureToggleActive('COOK_WALLET_STRIPE_BALANCE');
    const navigate = useNavigate({ from: '/{-$locale}/profile/wallet' });
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const client = useClient();
    const seedUser = data.currentSession.user ?? null;
    const seedDetails = seedUser?.cook?.stripeAccountDetails ?? null;
    const seedWallet = seedUser?.cook?.stripeWallet ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookWalletPageUpdatesDocument);
    const [, startOnboarding] = useMutation(ProfileCookStripeOnboardingStartDocument);
    const [, syncStatus] = useMutation(ProfileCookStripeStatusSyncDocument);
    const [, dashboardUrlCreate] = useMutation(ProfileCookStripeDashboardUrlCreateDocument);
    const [busy, setBusy] = useState(false);
    const [stripeDetails, setStripeDetails] = useState<GqlCCookStripeAccountDetails | null>(seedDetails);
    const [stripeWallet, setStripeWallet] = useState<GqlCCookStripeWallet | null>(seedWallet);
    const handledSearchRef = useRef<string | null>(null);

    const cook = user?.cook ?? null;

    useEffect(() => {
        setStripeDetails(seedDetails);
    }, [seedDetails]);

    useEffect(() => {
        setStripeWallet(seedWallet);
    }, [seedWallet]);

    const refreshStripeDetails = useEffectEvent(async () => {
        const result = await client.query(ProfileCookWalletStripeDetailsDocument, {}, { requestPolicy: 'network-only' }).toPromise();
        const cookLive = result.data?.currentSession.user?.cook;
        setStripeDetails(cookLive?.stripeAccountDetails ?? null);
        setStripeWallet(cookLive?.stripeWallet ?? null);
    });

    useEffect(() => {
        const key = search.stripeReturn ? 'return' : search.stripeRefresh ? 'refresh' : null;
        if (!key || !cook || handledSearchRef.current === key) {
            return;
        }
        handledSearchRef.current = key;

        void (async () => {
            setBusy(true);
            try {
                if (key === 'return') {
                    const result = await syncStatus({});
                    if (result.error || !result.data?.user.cook.stripeStatusSync.success) {
                        toast.error({ de: 'Status konnte nicht aktualisiert werden.', en: 'Could not refresh status.' }[locale]);
                    } else {
                        toast.success({ de: 'Wallet-Status aktualisiert.', en: 'Wallet status updated.' }[locale]);
                        await refreshStripeDetails();
                    }
                    await navigate({ search: {}, replace: true });
                    return;
                }

                const { returnUrl, refreshUrl } = walletUrls(locale);
                const result = await startOnboarding({ returnUrl, refreshUrl });
                const payload = result.data?.user.cook.stripeOnboardingStart;
                if (result.error || !payload) {
                    toast.error({ de: 'Onboarding konnte nicht gestartet werden.', en: 'Could not start onboarding.' }[locale]);
                    await navigate({ search: {}, replace: true });
                    return;
                }
                if (payload.kind === 'ONBOARDING_URL' && payload.url) {
                    window.location.assign(payload.url);
                    return;
                }
                if (payload.kind === 'ALREADY_COMPLETE') {
                    toast.success({ de: 'Wallet ist bereits eingerichtet.', en: 'Wallet is already set up.' }[locale]);
                    await refreshStripeDetails();
                } else if (payload.kind === 'NOT_APPROVED') {
                    toast.message(
                        {
                            de: 'Dein Profil muss zuerst freigeschaltet werden.',
                            en: 'Your profile must be approved first.',
                        }[locale],
                    );
                }
                await navigate({ search: {}, replace: true });
            } finally {
                setBusy(false);
            }
        })();
    }, [cook, locale, navigate, pathname, refreshStripeDetails, search.stripeRefresh, search.stripeReturn, startOnboarding, syncStatus]);

    async function onStartOnboarding() {
        if (!cook?.isApprovedByAdmin) return;
        setBusy(true);
        try {
            const { returnUrl, refreshUrl } = walletUrls(locale);
            const result = await startOnboarding({ returnUrl, refreshUrl });
            const payload = result.data?.user.cook.stripeOnboardingStart;
            if (result.error || !payload) {
                toast.error({ de: 'Onboarding konnte nicht gestartet werden.', en: 'Could not start onboarding.' }[locale]);
                return;
            }
            if (payload.kind === 'NOT_APPROVED') {
                toast.message(
                    {
                        de: 'Dein Profil muss zuerst freigeschaltet werden.',
                        en: 'Your profile must be approved first.',
                    }[locale],
                );
                return;
            }
            if (payload.kind === 'ALREADY_COMPLETE') {
                toast.success({ de: 'Wallet ist bereits eingerichtet.', en: 'Wallet is already set up.' }[locale]);
                await refreshStripeDetails();
                return;
            }
            if (payload.url) {
                window.location.assign(payload.url);
            }
        } finally {
            setBusy(false);
        }
    }

    async function onOpenDashboard() {
        setBusy(true);
        try {
            const result = await dashboardUrlCreate({});
            const url = result.data?.user.cook.stripeDashboardUrlCreate.url;
            if (result.error || !url) {
                toast.error({ de: 'Dashboard konnte nicht geöffnet werden.', en: 'Could not open the dashboard.' }[locale]);
                return;
            }
            window.location.assign(url);
        } finally {
            setBusy(false);
        }
    }

    async function onSync() {
        setBusy(true);
        try {
            const result = await syncStatus({});
            if (result.error || !result.data?.user.cook.stripeStatusSync.success) {
                toast.error({ de: 'Status konnte nicht aktualisiert werden.', en: 'Could not refresh status.' }[locale]);
                return;
            }
            toast.success({ de: 'Wallet-Status aktualisiert.', en: 'Wallet status updated.' }[locale]);
            await refreshStripeDetails();
        } finally {
            setBusy(false);
        }
    }

    if (!cook) {
        return null;
    }

    const primaryLabel = {
        EMPTY: { de: 'Wallet hinzufügen', en: 'Add wallet' },
        PREPARED: { de: 'Einrichtung fortsetzen', en: 'Continue setup' },
        ACTIVE_WAS_RESET: { de: 'Wallet aktualisieren', en: 'Update wallet' },
        COMPLETED: { de: 'Stripe-Dashboard öffnen', en: 'Open Stripe dashboard' },
    }[cook.stripeStatus][locale];

    const detailsChecklist =
        stripeDetails != null && stripeDetailsHasActionableContent(stripeDetails, cook.stripeStatus)
            ? {
                  details: stripeDetails,
                  categories: uniqueCategories(stripeDetails.pastDue, stripeDetails.currentlyDue, stripeDetails.pendingVerification),
              }
            : null;

    const showWalletBalance = walletBalanceEnabled && stripeWallet != null;
    const poolCta = (
        <Button asChild size="sm">
            <Link to="/{-$locale}/profile/booking-request-pool">
                {{ de: 'Zum Anfragen-Pool', en: 'Go to booking request pool' }[locale]}
            </Link>
        </Button>
    );

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-6">
            <div className="grid gap-2">
                <h1 className="font-serif text-3xl/tight text-foreground">{route.title[locale]}</h1>
                <p className="text-muted-foreground">{route.description[locale]}</p>
            </div>

            {!cook.isApprovedByAdmin ? (
                <StatusAlert tone="info" title={{ de: 'Freischaltung ausstehend', en: 'Approval pending' }[locale]}>
                    {
                        {
                            de: 'Dein Profil muss zuerst von unserem Team freigeschaltet werden, bevor du Stripe einrichten kannst.',
                            en: 'Your profile must be approved by our team before you can set up Stripe.',
                        }[locale]
                    }
                </StatusAlert>
            ) : (
                <div className="grid gap-4">
                    <StatusAlert tone={stripeStatusTone(cook.stripeStatus)} title={stripeStatusLabel(cook.stripeStatus, locale)}>
                        {stripeStatusDescription(cook.stripeStatus, locale)}
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
                                                de: 'Du musst gerade nichts weiter tun. Wir aktualisieren den Status, sobald Stripe fertig ist.',
                                                en: 'Nothing more to do right now. We will update the status once Stripe finishes.',
                                            }[locale]
                                        }
                                    </p>
                                ) : null}
                                {detailsChecklist.details.detailsSubmitted &&
                                (!detailsChecklist.details.chargesEnabled || !detailsChecklist.details.payoutsEnabled) &&
                                cook.stripeStatus !== 'COMPLETED' ? (
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
                    {cook.stripeStatus === 'COMPLETED' ? (
                        <StatusAlert tone="info" title={{ de: 'Bereit für Angebote', en: 'Ready to make offers' }[locale]} action={poolCta}>
                            {
                                {
                                    de: 'Im Anfragen-Pool findest du Buchungsanfragen in deinem Umkreis. Erstelle Angebote und verdiene mit peopleeat.',
                                    en: 'In the booking request pool you will find requests in your area. Create offers and earn with peopleeat.',
                                }[locale]
                            }
                        </StatusAlert>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                        {cook.stripeStatus === 'COMPLETED' ? (
                            <Button type="button" variant="outline" disabled={busy} onClick={() => void onOpenDashboard()}>
                                {primaryLabel}
                            </Button>
                        ) : (
                            <Button type="button" disabled={busy} onClick={() => void onStartOnboarding()}>
                                {primaryLabel}
                            </Button>
                        )}
                        {cook.stripeStatus !== 'EMPTY' && cook.stripeStatus !== 'COMPLETED' ? (
                            <Button type="button" variant="outline" disabled={busy} onClick={() => void onSync()}>
                                {{ de: 'Noch nicht aktualisiert?', en: 'Not updated yet?' }[locale]}
                            </Button>
                        ) : null}
                    </div>
                </div>
            )}

            {showWalletBalance ? (
                <section className="grid gap-6" aria-labelledby="wallet-balance-heading">
                    <div className="grid gap-3">
                        <h2 id="wallet-balance-heading" className="font-serif text-2xl/tight text-foreground">
                            {{ de: 'Guthaben', en: 'Balance' }[locale]}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1">
                                <p className="text-sm text-muted-foreground">{{ de: 'Verfügbar', en: 'Available' }[locale]}</p>
                                <p className="text-3xl/tight font-semibold tabular-nums text-foreground">
                                    {formatCurrency(stripeWallet.availableCents, { locale, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="grid gap-1">
                                <p className="text-sm text-muted-foreground">{{ de: 'Ausstehend', en: 'Pending' }[locale]}</p>
                                <p className="text-3xl/tight font-semibold tabular-nums text-foreground">
                                    {formatCurrency(stripeWallet.pendingCents, { locale, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Verfügbar bedeutet bereit für die Bankauszahlung. Ausstehend wird nach der Stripe-Frist freigegeben. Die Überweisung auf dein Konto löst unser Team nach dem Event aus.',
                                    en: 'Available means ready for bank payout. Pending clears after the Stripe hold period. Our team releases the transfer to your bank after the event.',
                                }[locale]
                            }
                        </p>
                    </div>

                    <div className="grid gap-3">
                        <h2 className="font-serif text-2xl/tight text-foreground">
                            {{ de: 'Letzte Bewegungen', en: 'Recent activity' }[locale]}
                        </h2>
                        {stripeWallet.transactions.length === 0 ? (
                            <p className="text-muted-foreground">
                                {
                                    {
                                        de: 'Noch keine Bewegungen. Sobald Kunden zahlen, erscheinen Gutschriften hier.',
                                        en: 'No activity yet. Credits appear here once customers pay.',
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
                                                {formatCurrency(txn.netCents, { locale, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </section>
            ) : null}
        </main>
    );
}
