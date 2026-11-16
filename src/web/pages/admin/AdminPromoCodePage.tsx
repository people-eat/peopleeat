import { Link, useRouter } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { CalendarClockIcon, FileInputIcon, TicketPercentIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SubmitEventHandler } from 'react';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatCurrency, formatDate } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Separator } from '../../components/base/separator';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminPromoCodePageQuery } from '../../graphql/generated';
import { AdminPromoCodeUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';

export function adminPromoCodePageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.promoCode.title');
}
export function adminPromoCodePageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.promoCode.description');
}

const PROMO_CODE_TABS = ['general', 'expiration', 'usage'] as const;

export type AdminPromoCodeTab = (typeof PROMO_CODE_TABS)[number];

export type AdminPromoCodeSearch = {
    tab?: AdminPromoCodeTab;
};

function isAdminPromoCodeTab(value: unknown): value is AdminPromoCodeTab {
    return typeof value === 'string' && (PROMO_CODE_TABS as readonly string[]).includes(value);
}

export function parseAdminPromoCodeSearch(search: Record<string, unknown>): AdminPromoCodeSearch {
    const tab = isAdminPromoCodeTab(search.tab) ? search.tab : undefined;
    return { tab };
}

export function adminPromoCodePageVariables(promoCodeId: string, search: AdminPromoCodeSearch) {
    const tab = search.tab ?? 'general';
    return {
        promoCodeId,
        includeUsage: tab === 'usage',
    };
}

type AdminPromoCodeDetail = NonNullable<
    NonNullable<NonNullable<GqlCAdminPromoCodePageQuery['currentSession']['user']>['admin']>['promoCode']
>;

type AdminPromoCodeUsageBookingRequest = NonNullable<AdminPromoCodeDetail['bookingRequests']>[number];

type AdminPromoCodeTabDef = {
    id: AdminPromoCodeTab;
    labelKey: string;
    Icon: LucideIcon;
};

const ADMIN_PROMO_CODE_TABS: readonly AdminPromoCodeTabDef[] = [
    { id: 'general', labelKey: 'promoCode.tabs.general', Icon: TicketPercentIcon },
    { id: 'expiration', labelKey: 'promoCode.tabs.expiration', Icon: CalendarClockIcon },
    { id: 'usage', labelKey: 'promoCode.tabs.usage', Icon: FileInputIcon },
];

function resolveAdminPromoCodeTab(tab: AdminPromoCodeTab | undefined): AdminPromoCodeTab {
    if (!tab || !isAdminPromoCodeTab(tab)) return 'general';
    return tab;
}

export function AdminPromoCodePage({
    data,
    search,
    promoCodeId,
}: {
    data: GqlCAdminPromoCodePageQuery;
    search: AdminPromoCodeSearch;
    promoCodeId: string;
}) {
    const locale = useLocale();
    const admin = data.currentSession.user?.admin;
    const promoCode = admin?.promoCode ?? null;
    const bookingRequests = promoCode?.bookingRequests ?? [];
    const crumbLabel = promoCode?.redeemCode.trim() || adminPromoCodePageTitle(locale);
    const tab = resolveAdminPromoCodeTab(search.tab);

    return (
        <AdminPageChrome
            crumbs={[{ label: t(locale, 'admin', 'copy.promoCodes'), to: '/{-$locale}/admin/promo-codes' }, { label: crumbLabel }]}
        >
            <main id="main-content" className="grid w-full content-start gap-6">
                {promoCode ? (
                    <>
                        <Tabs value={tab}>
                            <TabsList variant="line" aria-label={t(locale, 'admin', 'copy.promoCodeSections')}>
                                {ADMIN_PROMO_CODE_TABS.map(({ id, labelKey, Icon }) => (
                                    <TabsTrigger key={id} value={id} asChild>
                                        <Link
                                            to="/{-$locale}/admin/promo-codes/$promoCodeId"
                                            params={{ promoCodeId }}
                                            search={{ tab: id === 'general' ? undefined : id }}
                                            replace
                                        >
                                            <Icon aria-hidden />
                                            {t(locale, 'admin', labelKey)}
                                        </Link>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <AdminPromoCodeTabPanel tab={tab} promoCode={promoCode} bookingRequests={bookingRequests} />
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.promoCodeNotFound')}</p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminPromoCodeTabPanel({
    tab,
    promoCode,
    bookingRequests,
}: {
    tab: AdminPromoCodeTab;
    promoCode: AdminPromoCodeDetail;
    bookingRequests: AdminPromoCodeUsageBookingRequest[];
}) {
    switch (tab) {
        case 'general':
            return <AdminPromoCodeDetailFields promoCode={promoCode} />;
        case 'expiration':
            return <AdminPromoCodeExpirationForm promoCode={promoCode} />;
        case 'usage':
            return <AdminPromoCodeUsage bookingRequests={bookingRequests} />;
    }
}

function AdminPromoCodeDetailFields({ promoCode }: { promoCode: AdminPromoCodeDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const expired = new Date(promoCode.expiresAt).getTime() <= Date.now();

    return (
        <dl className="grid gap-4">
            <DetailField label={t(locale, 'admin', 'copy.promoCodeId')} value={promoCode.promoCodeId} mono />
            <Separator />
            <DetailField label={t(locale, 'admin', 'copy.redeemCode')} value={promoCode.redeemCode} mono />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.amount')}
                value={formatCurrency(promoCode.amountCents, { locale, maximumFractionDigits: 0 })}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.minimumPrice')}
                value={
                    promoCode.minimumTotalAmountCustomerCents == null
                        ? t(locale, 'admin', 'copy.none')
                        : formatCurrency(promoCode.minimumTotalAmountCustomerCents, { locale, maximumFractionDigits: 0 })
                }
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.scope')}
                value={
                    promoCode.scopedBookingRequestId
                        ? t(locale, 'admin', 'copy.scopedToBookingRequest', { id: promoCode.scopedBookingRequestId })
                        : t(locale, 'admin', 'copy.global')
                }
                mono={Boolean(promoCode.scopedBookingRequestId)}
            />
            <Separator />
            <div className="grid gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(locale, 'admin', 'copy.status')}</dt>
                <dd>
                    <Badge variant={expired ? 'secondary' : 'default'}>
                        {expired ? t(locale, 'admin', 'copy.expired2') : t(locale, 'admin', 'copy.active')}
                    </Badge>
                </dd>
            </div>
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.created')}
                value={formatDate(promoCode.createdAt, { locale, timeZone, dateStyle: 'long' })}
            />
            <Separator />
            <DetailField
                label={t(locale, 'admin', 'copy.expires2')}
                value={formatDate(promoCode.expiresAt, { locale, timeZone, dateStyle: 'long' })}
            />
        </dl>
    );
}

function AdminPromoCodeExpirationForm({ promoCode }: { promoCode: AdminPromoCodeDetail }) {
    const locale = useLocale();
    const router = useRouter();
    const [, promoCodeUpdate] = useMutation(AdminPromoCodeUpdateDocument);
    const [expiresAt, setExpiresAt] = useState(() => new Date(promoCode.expiresAt));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setExpiresAt(new Date(promoCode.expiresAt));
        setSaved(false);
        setError(false);
    }, [promoCode.expiresAt, promoCode.promoCodeId]);

    const onSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (busy) return;
        if (Number.isNaN(expiresAt.getTime())) {
            setError(true);
            return;
        }

        setBusy(true);
        setError(false);
        setSaved(false);
        try {
            const result = await promoCodeUpdate({
                input: {
                    promoCodeId: promoCode.promoCodeId,
                    expiresAt: expiresAt.toISOString(),
                },
            });
            if (result.error || !result.data?.admin.promoCodeUpdate.success) {
                setError(true);
                return;
            }
            setSaved(true);
            await router.invalidate();
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="grid max-w-xl gap-4">
            <div className="grid gap-1">
                <h2 className="font-serif text-2xl/tight text-foreground">{t(locale, 'admin', 'copy.manageExpiration')}</h2>
                <p className="text-sm text-muted-foreground">
                    {t(locale, 'admin', 'copy.changeTheExpirationOrInvalidateTheCodeImmediatelyAmountAndRe')}
                </p>
            </div>

            <form className="grid gap-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <span id="admin-promo-detail-expires-label" className="text-sm font-medium">
                        {t(locale, 'admin', 'copy.expirationDateAndTime')}
                    </span>
                    <DateTimePicker
                        value={expiresAt}
                        onValueChange={(date) => {
                            setExpiresAt(date);
                            setSaved(false);
                        }}
                        placeholder={t(locale, 'admin', 'copy.pickDateAndTime')}
                        timeAriaLabel={t(locale, 'admin', 'copy.time')}
                        locale={DATE_FNS_LOCALE[locale]}
                        aria-labelledby="admin-promo-detail-expires-label"
                        aria-invalid={error || undefined}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy}>
                        {t(locale, 'admin', 'copy.saveExpiration')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={async () => {
                            if (busy) return;
                            const now = new Date();
                            setExpiresAt(now);
                            setBusy(true);
                            setError(false);
                            setSaved(false);
                            try {
                                const result = await promoCodeUpdate({
                                    input: {
                                        promoCodeId: promoCode.promoCodeId,
                                        expiresAt: now.toISOString(),
                                    },
                                });
                                if (result.error || !result.data?.admin.promoCodeUpdate.success) {
                                    setError(true);
                                    return;
                                }
                                setSaved(true);
                                await router.invalidate();
                            } catch {
                                setError(true);
                            } finally {
                                setBusy(false);
                            }
                        }}
                    >
                        {t(locale, 'admin', 'copy.expireNow')}
                    </Button>
                </div>

                {error ? (
                    <p className="text-sm text-destructive" role="alert">
                        {t(locale, 'admin', 'copy.couldNotSave')}
                    </p>
                ) : null}
                {saved ? (
                    <p className="text-sm text-muted-foreground" role="status">
                        {t(locale, 'admin', 'copy.expirationUpdated')}
                    </p>
                ) : null}
            </form>
        </section>
    );
}

function AdminPromoCodeUsage({ bookingRequests }: { bookingRequests: AdminPromoCodeUsageBookingRequest[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    if (bookingRequests.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noRedemptionsYet')}</p>;
    }

    return (
        <ul className="grid gap-3">
            {bookingRequests.map((request) => {
                const customerName = [request.customer.firstName, request.customer.lastName].filter(Boolean).join(' ').trim();
                return (
                    <li key={request.bookingRequestId} className="grid gap-1 border-b border-border/60 pb-3 last:border-b-0">
                        <Link
                            to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                            params={{ bookingRequestId: request.bookingRequestId }}
                            className="font-medium text-foreground hover:underline"
                        >
                            {customerName || request.customer.userId}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="tabular-nums">{formatDate(request.dateTime, { locale, timeZone, dateStyle: 'medium' })}</span>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className={mono ? 'font-mono text-sm break-all text-foreground' : 'text-sm text-foreground'}>{value}</dd>
        </div>
    );
}
