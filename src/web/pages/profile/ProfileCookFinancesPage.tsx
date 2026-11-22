import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useClient, useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatCountryName, formatCurrency, formatDate } from '../../../shared';
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
} from '../../../shared/cookStripe';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import { CookInvoiceAddressDialog } from '../../components/CookInvoiceAddressDialog';
import type {
    GqlCCookStripeAccountDetails,
    GqlCCookStripeWallet,
    GqlCInvoiceAddress,
    GqlCProfileCookFinancesPageQuery,
} from '../../graphql/generated';
import {
    ProfileCookFinancesPageUpdatesDocument,
    ProfileCookFinancesStripeDetailsDocument,
    ProfileCookStripeDashboardUrlCreateDocument,
    ProfileCookStripeOnboardingStartDocument,
    ProfileCookStripeStatusSyncDocument,
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

const route = cookNavRouteBySlug('finances');
export const profileCookFinancesPageTitle = route.title;
export const profileCookFinancesPageDescription = route.description;

export type ProfileFinancesSearch = {
    stripeReturn?: true;
    stripeRefresh?: true;
};

export function parseProfileFinancesSearch(search: Record<string, unknown>): ProfileFinancesSearch {
    return {
        stripeReturn: search.stripeReturn === '1' || search.stripeReturn === true ? true : undefined,
        stripeRefresh: search.stripeRefresh === '1' || search.stripeRefresh === true ? true : undefined,
    };
}

function financesUrls(locale: Locale): { returnUrl: string; refreshUrl: string } {
    const origin = webPageUrlGet();
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    const base = `${origin}${prefix}/profile/finances`;
    return {
        returnUrl: `${base}?stripeReturn=1`,
        refreshUrl: `${base}?stripeRefresh=1`,
    };
}

export function ProfileCookFinancesPage({ data, search }: { data: GqlCProfileCookFinancesPageQuery; search: ProfileFinancesSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const walletBalanceEnabled = useFeatureToggleActive('COOK_WALLET_STRIPE_BALANCE');
    const navigate = useNavigate({ from: '/{-$locale}/profile/finances' });
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const client = useClient();
    const seedUser = data.currentSession.user ?? null;
    const seedDetails = seedUser?.cook?.stripeAccountDetails ?? null;
    const seedWallet = seedUser?.cook?.stripeWallet ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookFinancesPageUpdatesDocument);
    const [, startOnboarding] = useMutation(ProfileCookStripeOnboardingStartDocument);
    const [, syncStatus] = useMutation(ProfileCookStripeStatusSyncDocument);
    const [, dashboardUrlCreate] = useMutation(ProfileCookStripeDashboardUrlCreateDocument);
    const [busy, setBusy] = useState(false);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [stripeDetails, setStripeDetails] = useState<GqlCCookStripeAccountDetails | null>(seedDetails);
    const [stripeWallet, setStripeWallet] = useState<GqlCCookStripeWallet | null>(seedWallet);
    const handledSearchRef = useRef<string | null>(null);

    const cook = user?.cook ?? null;
    const invoiceAddress = cook?.invoiceAddress ?? null;

    useEffect(() => {
        setStripeDetails(seedDetails);
    }, [seedDetails]);

    useEffect(() => {
        setStripeWallet(seedWallet);
    }, [seedWallet]);

    const refreshStripeDetails = useEffectEvent(async () => {
        const result = await client.query(ProfileCookFinancesStripeDetailsDocument, {}, { requestPolicy: 'network-only' }).toPromise();
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
                        toast.error(t(locale, 'profileCook', 'finances.statusRefreshFailed'));
                    } else {
                        toast.success(t(locale, 'profileCook', 'finances.statusUpdated'));
                        await refreshStripeDetails();
                    }
                    await navigate({ search: {}, replace: true });
                    return;
                }

                const { returnUrl, refreshUrl } = financesUrls(locale);
                const result = await startOnboarding({ returnUrl, refreshUrl });
                const payload = result.data?.user.cook.stripeOnboardingStart;
                if (result.error || !payload) {
                    toast.error(t(locale, 'profileCook', 'finances.onboardingFailed'));
                    await navigate({ search: {}, replace: true });
                    return;
                }
                if (payload.kind === 'ONBOARDING_URL' && payload.url) {
                    window.location.assign(payload.url);
                    return;
                }
                if (payload.kind === 'ALREADY_COMPLETE') {
                    toast.success(t(locale, 'profileCook', 'finances.alreadySetUp'));
                    await refreshStripeDetails();
                } else if (payload.kind === 'NOT_APPROVED') {
                    toast.message(t(locale, 'profileCook', 'finances.mustBeApproved'));
                }
                await navigate({ search: {}, replace: true });
            } finally {
                setBusy(false);
            }
        })();
    }, [cook, locale, navigate, pathname, search.stripeRefresh, search.stripeReturn, startOnboarding, syncStatus]);

    async function onStartOnboarding() {
        if (!cook?.isApprovedByAdmin) return;
        setBusy(true);
        try {
            const { returnUrl, refreshUrl } = financesUrls(locale);
            const result = await startOnboarding({ returnUrl, refreshUrl });
            const payload = result.data?.user.cook.stripeOnboardingStart;
            if (result.error || !payload) {
                toast.error(t(locale, 'profileCook', 'finances.onboardingFailed'));
                return;
            }
            if (payload.kind === 'NOT_APPROVED') {
                toast.message(t(locale, 'profileCook', 'finances.mustBeApproved'));
                return;
            }
            if (payload.kind === 'ALREADY_COMPLETE') {
                toast.success(t(locale, 'profileCook', 'finances.alreadySetUp'));
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
                toast.error(t(locale, 'profileCook', 'finances.dashboardFailed'));
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
                toast.error(t(locale, 'profileCook', 'finances.statusRefreshFailed'));
                return;
            }
            toast.success(t(locale, 'profileCook', 'finances.statusUpdated'));
            await refreshStripeDetails();
        } finally {
            setBusy(false);
        }
    }

    if (!cook) {
        return null;
    }

    const primaryLabel = {
        EMPTY: t(locale, 'profileCook', 'finances.addFinances'),
        PREPARED: t(locale, 'profileCook', 'finances.continueSetup'),
        ACTIVE_WAS_RESET: t(locale, 'profileCook', 'finances.updateFinances'),
        COMPLETED: t(locale, 'profileCook', 'finances.openDashboard'),
    }[cook.stripeStatus];

    const detailsChecklist =
        stripeDetails != null && cookStripeAccountDetailsHasActionableContent(stripeDetails, cook.stripeStatus)
            ? {
                  details: stripeDetails,
                  categories: cookStripeAccountDetailsCategories(stripeDetails),
              }
            : null;

    const showWalletBalance = walletBalanceEnabled && stripeWallet != null;
    const poolCta = (
        <Button asChild size="sm">
            <Link to="/{-$locale}/profile/booking-request-pool">{t(locale, 'profileCook', 'finances.goToPool')}</Link>
        </Button>
    );
    const invoiceAddressCta = (
        <Button type="button" size="sm" onClick={() => setInvoiceDialogOpen(true)}>
            {t(locale, 'profileCook', 'finances.invoiceAddress.addAction')}
        </Button>
    );

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-6">
            <div className="grid gap-2">
                <h1 className="font-serif text-3xl/tight text-foreground">{route.title(locale)}</h1>
                <p className="text-muted-foreground">{route.description(locale)}</p>
            </div>

            {invoiceAddress != null ? (
                <section className="grid gap-3" aria-labelledby="finances-invoice-address-heading">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <h2 id="finances-invoice-address-heading" className="font-serif text-2xl/tight text-foreground">
                            {t(locale, 'profileCook', 'finances.invoiceAddress.sectionTitle')}
                        </h2>
                        <Button type="button" variant="outline" size="sm" onClick={() => setInvoiceDialogOpen(true)}>
                            {t(locale, 'profileCook', 'finances.invoiceAddress.editAction')}
                        </Button>
                    </div>
                    <CookInvoiceAddressSummary address={invoiceAddress} locale={locale} />
                </section>
            ) : null}

            <div className="grid gap-4">
                {invoiceAddress == null ? (
                    <StatusAlert
                        tone="warning"
                        title={t(locale, 'profileCook', 'finances.invoiceAddress.missingTitle')}
                        action={invoiceAddressCta}
                    >
                        {t(locale, 'profileCook', 'finances.invoiceAddress.missingBody')}
                    </StatusAlert>
                ) : null}

                {!cook.isApprovedByAdmin ? (
                    <StatusAlert tone="info" title={t(locale, 'profileCook', 'finances.approvalPending')}>
                        {t(locale, 'profileCook', 'finances.approvalPendingBody')}
                    </StatusAlert>
                ) : (
                    <>
                        <StatusAlert
                            tone={cookStripeStatusTone(cook.stripeStatus)}
                            title={cookStripeStatusLabel(cook.stripeStatus, locale)}
                        >
                            {cookStripeStatusDescription(cook.stripeStatus, locale, 'cook')}
                        </StatusAlert>
                        {detailsChecklist ? (
                            <StatusAlert
                                tone={cookStripeAccountDetailsTone(detailsChecklist.details)}
                                title={cookStripeAccountDetailsTitle(detailsChecklist.details, locale)}
                            >
                                <div className="grid gap-2">
                                    {detailsChecklist.details.disabledReason != null ? (
                                        <p>{cookStripeDisabledReasonLabel(detailsChecklist.details.disabledReason, locale, 'cook')}</p>
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
                                        <p>{t(locale, 'profileCook', 'finances.waitingStripe')}</p>
                                    ) : null}
                                    {detailsChecklist.details.detailsSubmitted &&
                                    (!detailsChecklist.details.chargesEnabled || !detailsChecklist.details.payoutsEnabled) &&
                                    cook.stripeStatus !== 'COMPLETED' ? (
                                        <p>{t(locale, 'profileCook', 'finances.chargesNotEnabled')}</p>
                                    ) : null}
                                </div>
                            </StatusAlert>
                        ) : null}
                        {cook.stripeStatus === 'COMPLETED' ? (
                            <StatusAlert tone="info" title={t(locale, 'profileCook', 'finances.readyTitle')} action={poolCta}>
                                {t(locale, 'profileCook', 'finances.readyBody')}
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
                                    {t(locale, 'profileCook', 'finances.notUpdatedYet')}
                                </Button>
                            ) : null}
                        </div>
                    </>
                )}
            </div>

            {showWalletBalance ? (
                <section className="grid gap-6" aria-labelledby="finances-balance-heading">
                    <div className="grid gap-3">
                        <h2 id="finances-balance-heading" className="font-serif text-2xl/tight text-foreground">
                            {t(locale, 'profileCook', 'finances.balance')}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1">
                                <p className="text-sm text-muted-foreground">{t(locale, 'common', 'stripe.transactionStatus.AVAILABLE')}</p>
                                <p className="text-3xl/tight font-semibold tabular-nums text-foreground">
                                    {formatCurrency(stripeWallet.availableCents, { locale })}
                                </p>
                            </div>
                            <div className="grid gap-1">
                                <p className="text-sm text-muted-foreground">{t(locale, 'common', 'stripe.transactionStatus.PENDING')}</p>
                                <p className="text-3xl/tight font-semibold tabular-nums text-foreground">
                                    {formatCurrency(stripeWallet.pendingCents, { locale })}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'finances.balanceHint')}</p>
                    </div>

                    <div className="grid gap-3">
                        <h2 className="font-serif text-2xl/tight text-foreground">{t(locale, 'profileCook', 'finances.recentActivity')}</h2>
                        {stripeWallet.transactions.length === 0 ? (
                            <p className="text-muted-foreground">{t(locale, 'profileCook', 'finances.noActivity')}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t(locale, 'profileCook', 'actions.date')}</TableHead>
                                        <TableHead>{t(locale, 'profileCook', 'calls.exceptionType')}</TableHead>
                                        <TableHead>{t(locale, 'profileCook', 'actions.status')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'profileCook', 'actions.amount')}</TableHead>
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
                </section>
            ) : null}

            <CookInvoiceAddressDialog
                open={invoiceDialogOpen}
                onOpenChange={setInvoiceDialogOpen}
                invoiceAddress={invoiceAddress}
                travelOrigin={cook.exactTravelOriginAddress ?? null}
                seed={{ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' }}
            />
        </main>
    );
}

function CookInvoiceAddressSummary({ address, locale }: { address: GqlCInvoiceAddress; locale: Locale }) {
    const country = formatCountryName(address.country, { locale });
    return (
        <address className="grid gap-0.5 text-sm/relaxed text-foreground not-italic">
            {address.companyName ? <span>{address.companyName}</span> : null}
            <span>
                {address.firstName} {address.lastName}
            </span>
            <span>{address.line1}</span>
            {address.line2 ? <span>{address.line2}</span> : null}
            <span>
                {address.postalCode} {address.city}
            </span>
            {country ? <span>{country}</span> : <span>{address.country}</span>}
        </address>
    );
}
