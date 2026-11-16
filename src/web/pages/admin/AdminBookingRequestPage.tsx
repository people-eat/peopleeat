import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { BadgePercentIcon, FileInputIcon, FileTextIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import {
    bookingRequestSettingLabel,
    DEFAULT_TIME_ZONE,
    formatBookingEventWhenAdminFromCountry,
    formatCurrency,
    formatDate,
    formatParticipants,
    inlineCopy,
    userDisplayName,
} from '../../../shared';
import type { BookingRequestOfferStatus } from '../../../shared/bookingRequestOfferStatus';
import { bookingRequestStatusHue, bookingRequestStatusLabel } from '../../../shared/bookingRequestStatus';
import { AdminBookingRequestCookWithoutOfferCard } from '../../components/AdminBookingRequestCookWithoutOfferCard';
import { AdminBookingRequestOfferCard } from '../../components/AdminBookingRequestOfferCard';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { AdminQueuedJobsSection } from '../../components/AdminQueuedJobsSection';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Checkbox } from '../../components/base/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Separator } from '../../components/base/separator';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestDiscountEditor } from '../../components/BookingRequestDiscountEditor';
import { BookingRequestOfferParticipantAmendmentAdminPendingAlert } from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import {
    BookingRequestKitchenDetailsFactContent,
    bookingRequestKitchenDetailsHasFacts,
} from '../../components/BookingRequestVenueConditionsFacts';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import { BookingWhenLabel } from '../../components/BookingWhenLabel';
import type { GqlCAdminBookingRequestPageQuery, GqlCAdminBookingRequestPageRequestFragment } from '../../graphql/generated';
import {
    AdminBookingRequestCancelDocument,
    AdminBookingRequestCooksNotifyDocument,
    AdminBookingRequestDiscountUpdateDocument,
    AdminBookingRequestPageUpdatesDocument,
    AdminBookingRequestPublicationApproveDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminBookingRequestCustomerLabel, adminBookingRequestPublicationStatusLabel } from './adminBookingRequestsColumns';
import { adminStubRouteBySlug, adminStubRouteTitle } from './adminCatalog';

const CANCELABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW', 'EXPIRED']);
const DISCOUNT_EDITABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW']);

const listRoute = adminStubRouteBySlug('booking-requests');

export function adminBookingRequestPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequest.title');
}
export function adminBookingRequestPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequest.description');
}

const BOOKING_REQUEST_TABS = ['overview', 'offers', 'discount'] as const;

export type AdminBookingRequestTab = (typeof BOOKING_REQUEST_TABS)[number];

export type AdminBookingRequestSearch = {
    tab?: AdminBookingRequestTab;
};

function isAdminBookingRequestTab(value: unknown): value is AdminBookingRequestTab {
    return typeof value === 'string' && (BOOKING_REQUEST_TABS as readonly string[]).includes(value);
}

export function parseAdminBookingRequestSearch(search: Record<string, unknown>): AdminBookingRequestSearch {
    // Older links used `accepted-offer` — fold into the offers funnel.
    if (search.tab === 'accepted-offer') {
        return { tab: 'offers' };
    }
    const tab = isAdminBookingRequestTab(search.tab) ? search.tab : undefined;
    return { tab };
}

export function adminBookingRequestPageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

type AdminBookingRequestDetail = GqlCAdminBookingRequestPageRequestFragment;

type AdminBookingRequestOffer = AdminBookingRequestDetail['offers'][number];
type AdminBookingRequestCookInRadius = AdminBookingRequestDetail['cooksInTravelRadius'][number];

type AdminBookingRequestTabDef = {
    id: AdminBookingRequestTab;
    labelKey: string;
    Icon: LucideIcon;
};

const ADMIN_BOOKING_REQUEST_TABS: readonly AdminBookingRequestTabDef[] = [
    { id: 'overview', labelKey: 'bookingRequest.tabs.overview', Icon: FileInputIcon },
    { id: 'offers', labelKey: 'bookingRequest.tabs.offers', Icon: FileTextIcon },
    { id: 'discount', labelKey: 'bookingRequest.tabs.discount', Icon: BadgePercentIcon },
];

const ACCEPTED_PATH_OFFER_STATUSES = new Set<BookingRequestOfferStatus>([
    'USER_NEEDS_DEPOSIT_PAYMENT',
    'PAYMENT_PULL_PENDING',
    'EVENT_PENDING',
    'COMPLETED',
]);

const INACTIVE_OFFER_STATUSES = new Set<BookingRequestOfferStatus>([
    'USER_DECLINED',
    'COOK_DECLINED',
    'USER_CHOOSE_DIFFERENT_OFFER',
    'EXPIRED',
    'CANCELED',
]);

function resolveAdminBookingRequestTab(tab: AdminBookingRequestTab | undefined): AdminBookingRequestTab {
    return tab && isAdminBookingRequestTab(tab) ? tab : 'overview';
}

function acceptedOfferFind(offers: AdminBookingRequestOffer[]): AdminBookingRequestOffer | null {
    return offers.find((offer) => offer.userAccepted === true && offer.cookAccepted === true) ?? null;
}

function offerDisplayRank(status: BookingRequestOfferStatus): number {
    if (ACCEPTED_PATH_OFFER_STATUSES.has(status)) {
        return 0;
    }
    if (INACTIVE_OFFER_STATUSES.has(status)) {
        return 2;
    }
    return 1;
}

function formatTravelDistanceKm(km: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    }).format(km);
}

function isPublicationApproved(publicationStatus: AdminBookingRequestDetail['publicationStatus']): boolean {
    return publicationStatus === 'PUBLICATION_AUTO_APPROVED' || publicationStatus === 'PUBLICATION_APPROVED_BY_ADMIN';
}

function canApprovePublication(bookingRequest: AdminBookingRequestDetail): boolean {
    return (
        bookingRequest.publicationStatus === 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' &&
        !bookingRequest.canceledAt &&
        !(bookingRequest.expiresAt && new Date(bookingRequest.expiresAt).getTime() < Date.now())
    );
}

function canCancelBookingRequest(bookingRequest: AdminBookingRequestDetail): boolean {
    return CANCELABLE_STATUSES.has(bookingRequest.status) && !bookingRequest.canceledAt;
}

export function AdminBookingRequestPage({
    data,
    search,
    bookingRequestId,
}: {
    data: GqlCAdminBookingRequestPageQuery;
    search: AdminBookingRequestSearch;
    bookingRequestId: string;
}) {
    const locale = useLocale();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedRequest = seedAdmin?.bookingRequest ?? null;

    const [bookingRequest, setBookingRequest] = useState<AdminBookingRequestDetail | null>(seedRequest);
    const [, approvePublication] = useMutation(AdminBookingRequestPublicationApproveDocument);
    const [, cancelRequest] = useMutation(AdminBookingRequestCancelDocument);
    const [approveBusy, setApproveBusy] = useState(false);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [selectedCookIds, setSelectedCookIds] = useState<string[]>([]);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelBusy, setCancelBusy] = useState(false);

    const crumbLabel = bookingRequest?.occasion.trim() || adminBookingRequestPageTitle(locale);
    const tab = resolveAdminBookingRequestTab(search.tab);
    const cooksInRadius = bookingRequest?.cooksInTravelRadius ?? [];
    const canApprove = bookingRequest != null && canApprovePublication(bookingRequest);
    const canCancel = bookingRequest != null && canCancelBookingRequest(bookingRequest);

    useEffect(() => {
        setBookingRequest(seedRequest);
    }, [seedRequest]);

    useEffect(() => {
        if (!seedAdmin) return;
        const subscription = createRequest(AdminBookingRequestPageUpdatesDocument, { bookingRequestId });
        const { unsubscribe } = pipe(
            client.executeSubscription(subscription),
            subscribe((result) => {
                const next = result.data?.adminUpdates.bookingRequest;
                if (next) setBookingRequest(next);
            }),
        );
        return unsubscribe;
    }, [bookingRequestId, client, seedAdmin]);

    function openApproveDialog() {
        setSelectedCookIds(cooksInRadius.map((row) => row.cook.cookId));
        setApproveDialogOpen(true);
    }

    async function onApprovePublication() {
        if (approveBusy || !bookingRequest) return;
        if (cooksInRadius.length > 0 && selectedCookIds.length === 0) {
            toast.error(t(locale, 'admin', 'copy.selectAtLeastOneCook'));
            return;
        }
        setApproveBusy(true);
        try {
            const result = await approvePublication({
                bookingRequestId,
                cookIds: cooksInRadius.length === 0 ? null : selectedCookIds,
            });
            if (!result.data?.admin.bookingRequestPublicationApprove.success) {
                throw new Error('approve failed');
            }
            setApproveDialogOpen(false);
            toast.success(t(locale, 'admin', 'copy.requestApproved'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotApproveTheRequest'));
        } finally {
            setApproveBusy(false);
        }
    }

    async function onCancelRequest() {
        if (cancelBusy || !bookingRequest) return;
        const reason = cancelReason.trim();
        if (reason.length === 0) return;
        setCancelBusy(true);
        try {
            const result = await cancelRequest({ bookingRequestId, reason });
            if (!result.data?.admin.bookingRequestCancel.success) {
                throw new Error('cancel failed');
            }
            setCancelDialogOpen(false);
            setCancelReason('');
            toast.success(t(locale, 'admin', 'copy.requestCancelled'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.cancellationFailed'));
        } finally {
            setCancelBusy(false);
        }
    }

    return (
        <AdminPageChrome
            crumbs={[
                { label: adminStubRouteTitle(listRoute.slug, locale), to: '/{-$locale}/admin/booking-requests' },
                { label: crumbLabel },
            ]}
        >
            {bookingRequest ? (
                <>
                    <AdminPinnedFooterLayout
                        className="@container"
                        contentClassName="grid w-full content-start gap-6"
                        footer={
                            <>
                                {tab === 'overview' && canCancel ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={cancelBusy}
                                        onClick={() => {
                                            setCancelReason('');
                                            setCancelDialogOpen(true);
                                        }}
                                    >
                                        {t(locale, 'admin', 'copy.cancelRequest')}
                                    </Button>
                                ) : null}
                                {tab === 'overview' && canApprove ? (
                                    <Button type="button" variant="outline" disabled={approveBusy} onClick={openApproveDialog}>
                                        {approveBusy ? t(locale, 'admin', 'copy.approving') : t(locale, 'admin', 'copy.approvePublication')}
                                    </Button>
                                ) : null}
                                {tab === 'offers' ? (
                                    <>
                                        <Button type="button" variant="outline" asChild>
                                            <Link
                                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/edit"
                                                params={{ bookingRequestId }}
                                            >
                                                {t(locale, 'admin', 'copy.edit')}
                                            </Link>
                                        </Button>
                                        <Button type="button" asChild>
                                            <Link
                                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/create"
                                                params={{ bookingRequestId }}
                                            >
                                                {t(locale, 'admin', 'copy.createOffer2')}
                                            </Link>
                                        </Button>
                                    </>
                                ) : (
                                    <Button type="button" asChild>
                                        <Link to="/{-$locale}/admin/booking-requests/$bookingRequestId/edit" params={{ bookingRequestId }}>
                                            {t(locale, 'admin', 'copy.edit')}
                                        </Link>
                                    </Button>
                                )}
                            </>
                        }
                    >
                        <Tabs value={tab}>
                            <TabsList variant="line" aria-label={t(locale, 'admin', 'copy.bookingRequestSections')}>
                                {ADMIN_BOOKING_REQUEST_TABS.map(({ id, labelKey, Icon }) => (
                                    <TabsTrigger key={id} value={id} asChild>
                                        <Link
                                            to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                                            params={{ bookingRequestId }}
                                            search={{ tab: id === 'overview' ? undefined : id }}
                                            replace
                                        >
                                            <Icon aria-hidden />
                                            {t(locale, 'admin', labelKey)}
                                        </Link>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <AdminBookingRequestTabPanel tab={tab} bookingRequest={bookingRequest} bookingRequestId={bookingRequestId} />
                    </AdminPinnedFooterLayout>

                    <AdminBookingRequestPublicationApproveDialog
                        open={approveDialogOpen}
                        onOpenChange={setApproveDialogOpen}
                        cooks={cooksInRadius}
                        selectedCookIds={selectedCookIds}
                        onSelectedCookIdsChange={setSelectedCookIds}
                        busy={approveBusy}
                        onConfirm={() => void onApprovePublication()}
                    />

                    <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t(locale, 'admin', 'copy.reallyCancelThisRequest')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t(locale, 'admin', 'copy.theCustomerAndCooksReceiveTheUsualCancellationEmailPleasePro')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Textarea
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                placeholder={t(locale, 'admin', 'copy.reason')}
                                rows={3}
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={cancelBusy}>{t(locale, 'admin', 'copy.back')}</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={cancelBusy || cancelReason.trim().length === 0}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        void onCancelRequest();
                                    }}
                                >
                                    {cancelBusy ? t(locale, 'admin', 'copy.cancelling') : t(locale, 'admin', 'copy.cancelRequest2')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            ) : (
                <main id="main-content" className="@container grid w-full content-start gap-6">
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.bookingRequestNotFound')}</p>
                </main>
            )}
        </AdminPageChrome>
    );
}

function AdminBookingRequestPublicationApproveDialog({
    open,
    onOpenChange,
    cooks,
    selectedCookIds,
    onSelectedCookIdsChange,
    busy,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cooks: AdminBookingRequestCookInRadius[];
    selectedCookIds: string[];
    onSelectedCookIdsChange: (cookIds: string[]) => void;
    busy: boolean;
    onConfirm: () => void;
}) {
    const locale = useLocale();
    const selectedSet = useMemo(() => new Set(selectedCookIds), [selectedCookIds]);
    const allSelected = cooks.length > 0 && selectedCookIds.length === cooks.length;

    function toggleCook(cookId: string, checked: boolean) {
        if (checked) {
            onSelectedCookIdsChange([...selectedCookIds, cookId]);
            return;
        }
        onSelectedCookIdsChange(selectedCookIds.filter((id) => id !== cookId));
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t(locale, 'admin', 'copy.approvePublication2')}</DialogTitle>
                    <DialogDescription>{t(locale, 'admin', 'copy.chooseWhichCooksInTravelRadiusShouldBeNotified')}</DialogDescription>
                </DialogHeader>

                {cooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.noCooksFoundInTravelRadiusTheRequestWillBeApprovedWithoutNot')}
                    </p>
                ) : (
                    <div className="grid gap-3">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy || allSelected}
                                onClick={() => onSelectedCookIdsChange(cooks.map((row) => row.cook.cookId))}
                            >
                                {t(locale, 'admin', 'copy.selectAll')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy || selectedCookIds.length === 0}
                                onClick={() => onSelectedCookIdsChange([])}
                            >
                                {t(locale, 'admin', 'copy.clear')}
                            </Button>
                        </div>
                        <ul className="divide-y divide-border rounded-md border border-border">
                            {cooks.map((row) => {
                                const cookId = row.cook.cookId;
                                const checked = selectedSet.has(cookId);
                                const city = row.cook.exactTravelOriginAddress?.city;
                                return (
                                    <li key={cookId} className="flex items-start gap-3 px-3 py-2.5">
                                        <Checkbox
                                            checked={checked}
                                            disabled={busy}
                                            onCheckedChange={(value) => toggleCook(cookId, value === true)}
                                            aria-label={userDisplayName(row.cook.user)}
                                            className="mt-0.5"
                                        />
                                        <div className="grid min-w-0 flex-1 gap-0.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-sm font-medium">{userDisplayName(row.cook.user)}</span>
                                                {row.notifiedAt ? (
                                                    <Badge variant="secondary">{t(locale, 'admin', 'copy.alreadyNotified')}</Badge>
                                                ) : null}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {[
                                                    city,
                                                    row.cook.cuisineStyle,
                                                    `${formatTravelDistanceKm(row.estimatedTravelDistanceKm, locale)} km`,
                                                    inlineCopy(
                                                        {
                                                            de: `Reise ca. ${formatCurrency(row.estimatedTravelExpensesCents, { locale, maximumFractionDigits: 0 })}`,
                                                            en: `Travel ~${formatCurrency(row.estimatedTravelExpensesCents, { locale, maximumFractionDigits: 0 })}`,
                                                        },
                                                        locale,
                                                    ),
                                                    inlineCopy(
                                                        {
                                                            de: `Menü ~${formatCurrency(row.suggestedMenuPriceCents, { locale, maximumFractionDigits: 0 })}`,
                                                            en: `Menu ~${formatCurrency(row.suggestedMenuPriceCents, { locale, maximumFractionDigits: 0 })}`,
                                                        },
                                                        locale,
                                                    ),
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">{row.cook.user.emailAddress}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                        {t(locale, 'admin', 'copy.cancel')}
                    </Button>
                    <Button type="button" disabled={busy || (cooks.length > 0 && selectedCookIds.length === 0)} onClick={onConfirm}>
                        {busy
                            ? t(locale, 'admin', 'copy.approving')
                            : inlineCopy(
                                  { de: `Freigeben (${selectedCookIds.length})`, en: `Approve (${selectedCookIds.length})` },
                                  locale,
                              )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AdminBookingRequestTabPanel({
    tab,
    bookingRequest,
    bookingRequestId,
}: {
    tab: AdminBookingRequestTab;
    bookingRequest: AdminBookingRequestDetail;
    bookingRequestId: string;
}) {
    switch (tab) {
        case 'overview':
            return <AdminBookingRequestDetailFields bookingRequest={bookingRequest} />;
        case 'offers':
            return <AdminBookingRequestOffersSection bookingRequest={bookingRequest} bookingRequestId={bookingRequestId} />;
        case 'discount':
            return <AdminBookingRequestDiscountSection bookingRequest={bookingRequest} bookingRequestId={bookingRequestId} />;
    }
}

function AdminBookingRequestDiscountSection({
    bookingRequest,
    bookingRequestId,
}: {
    bookingRequest: AdminBookingRequestDetail;
    bookingRequestId: string;
}) {
    const locale = useLocale();
    const [, updateDiscount] = useMutation(AdminBookingRequestDiscountUpdateDocument);
    const dualAccepted = bookingRequest.offers.some((offer) => offer.userAccepted === true && offer.cookAccepted === true);
    const canEditDiscount = DISCOUNT_EDITABLE_STATUSES.has(bookingRequest.status) && !bookingRequest.canceledAt && !dualAccepted;

    return (
        <div className="grid max-w-xl gap-4">
            <h2 className="font-serif text-2xl/tight text-foreground">{t(locale, 'admin', 'copy.discount')}</h2>
            <BookingRequestDiscountEditor
                bookingRequestId={bookingRequestId}
                locale={locale}
                canEdit={canEditDiscount}
                promoCode={bookingRequest.promoCode}
                giftCard={bookingRequest.giftCard}
                onDiscountUpdate={async ({ bookingRequestId: id, redeemCode }) => {
                    const result = await updateDiscount({ bookingRequestId: id, redeemCode });
                    return result.data?.admin.bookingRequestDiscountUpdate.success === true;
                }}
            />
        </div>
    );
}

function AdminBookingRequestDetailFields({ bookingRequest }: { bookingRequest: AdminBookingRequestDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const empty = t(locale, 'admin', 'copy.empty');
    const address = bookingRequest.exactEventAddress;
    const invoice = bookingRequest.invoiceAddress;

    return (
        <div className="grid gap-4">
            <dl className="grid gap-4">
                <DetailField label={t(locale, 'admin', 'copy.requestId')} value={bookingRequest.bookingRequestId} mono />
                <Separator />
                <div className="grid gap-2">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.status')}
                    </dt>
                    <dd className="flex flex-wrap items-center gap-2">
                        <BookingStatusPill hue={bookingRequestStatusHue(bookingRequest.status)}>
                            {bookingRequestStatusLabel(bookingRequest.status, locale, 'admin')}
                        </BookingStatusPill>
                        <Badge variant="outline">
                            {adminBookingRequestPublicationStatusLabel(bookingRequest.publicationStatus, locale)}
                        </Badge>
                    </dd>
                </div>
                <Separator />
                {bookingRequest.requestedCook ? (
                    <>
                        <DetailField
                            label={t(locale, 'admin', 'copy.requestedCook')}
                            value={userDisplayName(bookingRequest.requestedCook.user)}
                        />
                        <Separator />
                    </>
                ) : null}
                {bookingRequest.requestedMenu ? (
                    <>
                        <DetailField label={t(locale, 'admin', 'copy.requestedMenu')} value={bookingRequest.requestedMenu.title} />
                        <Separator />
                    </>
                ) : null}
                <DetailField label={t(locale, 'admin', 'copy.occasion')} value={bookingRequest.occasion} />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.event')}
                    value={
                        <BookingWhenLabel
                            {...formatBookingEventWhenAdminFromCountry({
                                instant: bookingRequest.dateTime,
                                locale,
                                venueCountry: address.country,
                                venueCity: address.city,
                                customerTimeZone: bookingRequest.customer.timeZone,
                                cookTimeZone: bookingRequest.cook?.user.timeZone ?? DEFAULT_TIME_ZONE,
                                viewerTimeZone: timeZone,
                            })}
                        />
                    }
                />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.participants')}
                    value={formatParticipants(bookingRequest.participants, { locale })}
                />
                <Separator />
                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.customer')}
                    </dt>
                    <dd className="text-sm text-foreground">
                        <div className="grid gap-0.5">
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: bookingRequest.customer.userId }}
                                className="font-medium text-foreground hover:underline"
                            >
                                {adminBookingRequestCustomerLabel(bookingRequest.customer)}
                            </Link>
                            <span className="text-muted-foreground">{bookingRequest.customer.emailAddress}</span>
                        </div>
                    </dd>
                </div>
                <Separator />
                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.acceptedCook')}
                    </dt>
                    <dd className="text-sm text-foreground">
                        {bookingRequest.cook?.user ? (
                            <div className="grid gap-0.5">
                                <Link
                                    to="/{-$locale}/admin/users/$userId"
                                    params={{ userId: bookingRequest.cook.user.userId }}
                                    className="font-medium text-foreground hover:underline"
                                >
                                    {userDisplayName(bookingRequest.cook.user)}
                                </Link>
                                <span className="text-muted-foreground">{bookingRequest.cook.user.emailAddress}</span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground">{empty}</span>
                        )}
                    </dd>
                </div>
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.location2')}
                    value={[address.displayText, address.city, address.postCode, address.country].filter(Boolean).join(' · ') || empty}
                />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.aboutTheKitchen')}
                    value={
                        bookingRequestKitchenDetailsHasFacts(bookingRequest.kitchenDetails, locale) ? (
                            <BookingRequestKitchenDetailsFactContent details={bookingRequest.kitchenDetails} locale={locale} />
                        ) : (
                            empty
                        )
                    }
                />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.whereYouDine')}
                    value={bookingRequest.setting != null ? bookingRequestSettingLabel(bookingRequest.setting, locale) : empty}
                />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.message')}
                    value={bookingRequest.adjustedMessage?.trim() || bookingRequest.originalMessage || empty}
                />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.preferences')}
                    value={bookingRequest.preferences.length > 0 ? bookingRequest.preferences.join(', ') : empty}
                />
                <Separator />
                <DetailField label={t(locale, 'admin', 'copy.priceClass')} value={bookingRequest.priceClassType ?? empty} />
                <Separator />
                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'admin', 'copy.participants')}
                    </dt>
                    <dd className="text-sm text-foreground">
                        {bookingRequest.participants.length === 0 ? (
                            <span className="text-muted-foreground">{empty}</span>
                        ) : (
                            <ul className="grid gap-1">
                                {bookingRequest.participants.map((participant) => (
                                    <li key={participant.bookingRequestParticipantId}>
                                        <span className="font-medium">{participant.name || participant.type}</span>
                                        <span className="text-muted-foreground">
                                            {' '}
                                            · {participant.type}
                                            {participant.restrictions.length > 0 ? ` · ${participant.restrictions.join(', ')}` : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </dd>
                </div>
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.invoiceAddress')}
                    value={
                        invoice
                            ? [
                                  invoice.companyName,
                                  `${invoice.firstName} ${invoice.lastName}`,
                                  invoice.line1,
                                  invoice.line2,
                                  `${invoice.postalCode} ${invoice.city}`,
                                  invoice.country,
                              ]
                                  .filter((part) => part && String(part).trim().length > 0)
                                  .join(', ')
                            : empty
                    }
                />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.created')}
                    value={formatDate(bookingRequest.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.expires')}
                    value={
                        bookingRequest.expiresAt ? formatDate(bookingRequest.expiresAt, { locale, timeZone, dateStyle: 'medium' }) : empty
                    }
                />
                <Separator />
                <DetailField
                    label={t(locale, 'admin', 'copy.canceled')}
                    value={
                        bookingRequest.canceledAt
                            ? `${formatDate(bookingRequest.canceledAt, { locale, timeZone, dateStyle: 'medium' })}${
                                  bookingRequest.cancellationReason ? ` · ${bookingRequest.cancellationReason}` : ''
                              }`
                            : empty
                    }
                />
            </dl>

            <div className="border-t border-border pt-4">
                <AdminQueuedJobsSection
                    jobs={bookingRequest.queuedJobs}
                    emptyMessage={{
                        de: 'Keine ausstehenden Jobs für diese Anfrage.',
                        en: 'No pending jobs for this request.',
                    }}
                    offerLink={(bookingRequestOfferId) => (
                        <Link
                            to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                            params={{
                                bookingRequestId: bookingRequest.bookingRequestId,
                                bookingRequestOfferId,
                            }}
                            className="font-medium text-foreground hover:underline"
                        >
                            {t(locale, 'admin', 'copy.viewOffer')}
                        </Link>
                    )}
                />
            </div>
        </div>
    );
}

function AdminBookingRequestOffersSection({
    bookingRequestId,
    bookingRequest,
}: {
    bookingRequestId: string;
    bookingRequest: AdminBookingRequestDetail;
}) {
    const locale = useLocale();
    const [, notifyCooks] = useMutation(AdminBookingRequestCooksNotifyDocument);
    const [notifyBusyCookId, setNotifyBusyCookId] = useState<string | null>(null);
    const [pendingNotifyCookId, setPendingNotifyCookId] = useState<string | null>(null);

    const acceptedOffer = acceptedOfferFind(bookingRequest.offers);
    const hasAcceptedOffer = acceptedOffer != null;
    const publicationApproved = isPublicationApproved(bookingRequest.publicationStatus);

    const openOffers = useMemo(
        () =>
            [...bookingRequest.offers]
                .filter((offer) => !(offer.userAccepted === true && offer.cookAccepted === true))
                .sort((left, right) => offerDisplayRank(left.status) - offerDisplayRank(right.status)),
        [bookingRequest.offers],
    );

    const cooksWithoutOffer = useMemo(
        () =>
            bookingRequest.cooksInTravelRadius.filter(
                (row) => !bookingRequest.offers.some((offer) => offer.cook.cookId === row.cook.cookId),
            ),
        [bookingRequest.cooksInTravelRadius, bookingRequest.offers],
    );
    const notifiedCooksWithoutOffer = cooksWithoutOffer.filter((row) => row.notifiedAt != null);
    const notNotifiedCooksInTravelRadius = cooksWithoutOffer.filter((row) => row.notifiedAt == null);
    const hasNotifiedCooksInTravelRadius = bookingRequest.cooksInTravelRadius.some((row) => row.notifiedAt != null);

    const pendingNotifyCook =
        pendingNotifyCookId == null
            ? null
            : (bookingRequest.cooksInTravelRadius.find((row) => row.cook.cookId === pendingNotifyCookId) ?? null);
    const pendingNotifyAlreadyNotified = pendingNotifyCook?.notifiedAt != null;
    const pendingNotifyCookName = pendingNotifyCook ? userDisplayName(pendingNotifyCook.cook.user) : '';
    const notifyBusy = notifyBusyCookId != null;

    const emptyOffersMessage = (() => {
        if (acceptedOffer) {
            return t(locale, 'admin', 'copy.noOtherOffers');
        }
        if (!publicationApproved) {
            return t(locale, 'admin', 'copy.noOffersYetOffersAppearAfterTheRequestIsApprovedAndChefsAreN');
        }
        if (cooksWithoutOffer.length > 0) {
            return t(locale, 'admin', 'copy.noOffersYetNotifyChefsBelowOrCreateAnOfferManually');
        }
        if (bookingRequest.cooksInTravelRadius.length === 0) {
            return t(locale, 'admin', 'copy.noOffersYetAndNoChefsInTravelRadius');
        }
        return t(locale, 'admin', 'copy.noOffersYet');
    })();

    const emptyNotifiedCooksMessage = hasNotifiedCooksInTravelRadius
        ? t(locale, 'admin', 'copy.allNotifiedChefsHaveCreatedAnOffer')
        : t(locale, 'admin', 'copy.noChefsNotifiedYet');

    const emptyNotNotifiedCooksMessage =
        bookingRequest.cooksInTravelRadius.length === 0
            ? t(locale, 'admin', 'copy.noChefsInTravelRadius')
            : t(locale, 'admin', 'copy.allChefsInTravelRadiusHaveBeenNotified');

    async function onConfirmNotifyCook() {
        if (pendingNotifyCookId == null) {
            return;
        }
        const cookId = pendingNotifyCookId;
        setNotifyBusyCookId(cookId);
        try {
            const result = await notifyCooks({ bookingRequestId, cookIds: [cookId] });
            if (result.error || !result.data?.admin.bookingRequestCooksNotify.success) {
                toast.error(t(locale, 'admin', 'copy.notificationFailedPleaseTryAgain'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.chefNotified'));
            setPendingNotifyCookId(null);
        } finally {
            setNotifyBusyCookId(null);
        }
    }

    return (
        <div className="grid gap-8">
            {acceptedOffer ? (
                <section className="grid gap-3">
                    <h2 className="text-base font-semibold">{t(locale, 'admin', 'copy.acceptedOffer')}</h2>
                    {acceptedOffer.participantAmendment != null ? (
                        <BookingRequestOfferParticipantAmendmentAdminPendingAlert
                            locale={locale}
                            amendment={acceptedOffer.participantAmendment}
                            action={
                                <Button type="button" size="sm" variant="outline" asChild>
                                    <Link
                                        to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                        params={{
                                            bookingRequestId,
                                            bookingRequestOfferId: acceptedOffer.bookingRequestOfferId,
                                        }}
                                        search={{ tab: 'costs' }}
                                    >
                                        {t(locale, 'admin', 'copy.viewOffer')}
                                    </Link>
                                </Button>
                            }
                        />
                    ) : null}
                    <div className="grid max-w-sm">
                        <AdminBookingRequestOfferCard bookingRequestId={bookingRequestId} offer={acceptedOffer} />
                    </div>
                </section>
            ) : null}

            <section className="grid gap-3">
                <h2 className="text-base font-semibold">{t(locale, 'admin', 'copy.chefsWhoCreatedOffers')}</h2>
                {openOffers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{emptyOffersMessage}</p>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                        {openOffers.map((offer) => (
                            <li key={offer.bookingRequestOfferId} className="min-w-0">
                                <AdminBookingRequestOfferCard bookingRequestId={bookingRequestId} offer={offer} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="grid gap-3">
                <h2 className="text-base font-semibold">{t(locale, 'admin', 'copy.notifiedChefsWithoutAnOffer')}</h2>
                {notifiedCooksWithoutOffer.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{emptyNotifiedCooksMessage}</p>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                        {notifiedCooksWithoutOffer.map((row) => (
                            <li key={row.cook.cookId} className="min-w-0">
                                <AdminBookingRequestCookWithoutOfferCard
                                    bookingRequestId={bookingRequestId}
                                    cookInTravelRadius={row}
                                    isPublicationApproved={publicationApproved}
                                    hasAcceptedOffer={hasAcceptedOffer}
                                    notifyBusy={notifyBusyCookId === row.cook.cookId}
                                    onNotify={setPendingNotifyCookId}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="grid gap-3">
                <h2 className="text-base font-semibold">{t(locale, 'admin', 'copy.chefsInTravelRadiusNotYetNotified')}</h2>
                {notNotifiedCooksInTravelRadius.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{emptyNotNotifiedCooksMessage}</p>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
                        {notNotifiedCooksInTravelRadius.map((row) => (
                            <li key={row.cook.cookId} className="min-w-0">
                                <AdminBookingRequestCookWithoutOfferCard
                                    bookingRequestId={bookingRequestId}
                                    cookInTravelRadius={row}
                                    isPublicationApproved={publicationApproved}
                                    hasAcceptedOffer={hasAcceptedOffer}
                                    notifyBusy={notifyBusyCookId === row.cook.cookId}
                                    onNotify={setPendingNotifyCookId}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <AlertDialog
                open={pendingNotifyCookId != null}
                onOpenChange={(open) => {
                    if (!open && !notifyBusy) {
                        setPendingNotifyCookId(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingNotifyAlreadyNotified
                                ? inlineCopy(
                                      {
                                          de: `${pendingNotifyCookName} erneut benachrichtigen?`,
                                          en: `Notify ${pendingNotifyCookName} again?`,
                                      },
                                      locale,
                                  )
                                : inlineCopy(
                                      {
                                          de: `${pendingNotifyCookName} diese Anfrage vorschlagen?`,
                                          en: `Suggest this request to ${pendingNotifyCookName}?`,
                                      },
                                      locale,
                                  )}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingNotifyAlreadyNotified
                                ? t(locale, 'admin', 'copy.theChefReceivesAnotherEmailAndALiveUpdateAboutThisRequestThe')
                                : t(locale, 'admin', 'copy.theChefReceivesAnEmailAndSeesTheRequestInTheirBookingRequest')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={notifyBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={notifyBusy}
                            onClick={(event) => {
                                event.preventDefault();
                                void onConfirmNotifyCook();
                            }}
                        >
                            {notifyBusy
                                ? t(locale, 'admin', 'copy.sending')
                                : pendingNotifyAlreadyNotified
                                  ? t(locale, 'admin', 'copy.sendAgain')
                                  : t(locale, 'admin', 'copy.suggest')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function DetailField({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className={`text-sm text-foreground ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</dd>
        </div>
    );
}
