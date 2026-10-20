import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { BadgePercentIcon, FileInputIcon, FileTextIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatCurrency, formatDate, formatDateTime, formatParticipants, userDisplayName } from '../../../shared';
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
import type { BookingRequestOfferStatusKey } from '../../components/bookingRequestOfferStatus';
import { adminBookingRequestStatusLabel, bookingRequestStatusClassName } from '../../components/bookingRequestStatus';
import { BookingStatusPill } from '../../components/BookingStatusPill';
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
import { adminStubRouteBySlug } from './adminCatalog';

const CANCELABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW', 'EXPIRED']);
const DISCOUNT_EDITABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW']);

const listRoute = adminStubRouteBySlug('booking-requests');

export const adminBookingRequestPageTitle = { de: 'Buchungsanfrage', en: 'Booking request' } as const;
export const adminBookingRequestPageDescription = {
    de: 'Details einer Buchungsanfrage.',
    en: 'Details for a booking request.',
} as const;

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
    label: Record<Locale, string>;
    Icon: LucideIcon;
};

const ADMIN_BOOKING_REQUEST_TABS: readonly AdminBookingRequestTabDef[] = [
    { id: 'overview', label: { de: 'Übersicht', en: 'Overview' }, Icon: FileInputIcon },
    { id: 'offers', label: { de: 'Angebote', en: 'Offers' }, Icon: FileTextIcon },
    { id: 'discount', label: { de: 'Rabatt', en: 'Discount' }, Icon: BadgePercentIcon },
];

const ACCEPTED_PATH_OFFER_STATUSES = new Set<BookingRequestOfferStatusKey>([
    'USER_NEEDS_DEPOSIT_PAYMENT',
    'PAYMENT_PULL_PENDING',
    'EVENT_PENDING',
    'COMPLETED',
]);

const INACTIVE_OFFER_STATUSES = new Set<BookingRequestOfferStatusKey>([
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

function offerDisplayRank(status: string): number {
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

    const crumbLabel = bookingRequest?.occasion.trim() || adminBookingRequestPageTitle[locale];
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
            toast.error({ de: 'Bitte mindestens einen Koch auswählen.', en: 'Select at least one cook.' }[locale]);
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
            toast.success({ de: 'Anfrage freigegeben.', en: 'Request approved.' }[locale]);
        } catch {
            toast.error({ de: 'Freigabe fehlgeschlagen.', en: 'Could not approve the request.' }[locale]);
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
            toast.success({ de: 'Anfrage storniert.', en: 'Request cancelled.' }[locale]);
        } catch {
            toast.error({ de: 'Stornierung fehlgeschlagen.', en: 'Cancellation failed.' }[locale]);
        } finally {
            setCancelBusy(false);
        }
    }

    return (
        <AdminPageChrome crumbs={[{ label: listRoute.title[locale], to: '/{-$locale}/admin/booking-requests' }, { label: crumbLabel }]}>
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
                                        {{ de: 'Anfrage stornieren', en: 'Cancel request' }[locale]}
                                    </Button>
                                ) : null}
                                {tab === 'overview' && canApprove ? (
                                    <Button type="button" variant="outline" disabled={approveBusy} onClick={openApproveDialog}>
                                        {approveBusy
                                            ? { de: 'Freigeben…', en: 'Approving…' }[locale]
                                            : { de: 'Veröffentlichen', en: 'Approve publication' }[locale]}
                                    </Button>
                                ) : null}
                                {tab === 'offers' ? (
                                    <>
                                        <Button type="button" variant="outline" asChild>
                                            <Link
                                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/edit"
                                                params={{ bookingRequestId }}
                                            >
                                                {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                                            </Link>
                                        </Button>
                                        <Button type="button" asChild>
                                            <Link
                                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/create"
                                                params={{ bookingRequestId }}
                                            >
                                                {{ de: 'Angebot anlegen', en: 'Create offer' }[locale]}
                                            </Link>
                                        </Button>
                                    </>
                                ) : (
                                    <Button type="button" asChild>
                                        <Link to="/{-$locale}/admin/booking-requests/$bookingRequestId/edit" params={{ bookingRequestId }}>
                                            {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                                        </Link>
                                    </Button>
                                )}
                            </>
                        }
                    >
                        <Tabs value={tab}>
                            <TabsList
                                variant="line"
                                aria-label={{ de: 'Buchungsanfrage-Bereiche', en: 'Booking request sections' }[locale]}
                            >
                                {ADMIN_BOOKING_REQUEST_TABS.map(({ id, label, Icon }) => (
                                    <TabsTrigger key={id} value={id} asChild>
                                        <Link
                                            to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                                            params={{ bookingRequestId }}
                                            search={{ tab: id === 'overview' ? undefined : id }}
                                            replace
                                        >
                                            <Icon aria-hidden />
                                            {label[locale]}
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
                                <AlertDialogTitle>
                                    {{ de: 'Anfrage wirklich stornieren?', en: 'Really cancel this request?' }[locale]}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Kunde und Köche erhalten die übliche E-Mail zur Stornierung. Bitte gib einen Grund an.',
                                            en: 'The customer and cooks receive the usual cancellation email. Please provide a reason.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Textarea
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                placeholder={{ de: 'Grund…', en: 'Reason…' }[locale]}
                                rows={3}
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={cancelBusy}>{{ de: 'Abbrechen', en: 'Back' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={cancelBusy || cancelReason.trim().length === 0}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        void onCancelRequest();
                                    }}
                                >
                                    {cancelBusy
                                        ? { de: 'Stornieren…', en: 'Cancelling…' }[locale]
                                        : { de: 'Stornieren', en: 'Cancel request' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            ) : (
                <main id="main-content" className="@container grid w-full content-start gap-6">
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Buchungsanfrage nicht gefunden.', en: 'Booking request not found.' }[locale]}
                    </p>
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
                    <DialogTitle>{{ de: 'Veröffentlichung freigeben', en: 'Approve publication' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Wähle die Köche im Anfahrtsradius, die benachrichtigt werden sollen.',
                                en: 'Choose which cooks in travel radius should be notified.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>

                {cooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Keine Köche im Anfahrtsradius gefunden. Die Anfrage wird freigegeben, ohne jemanden zu benachrichtigen.',
                                en: 'No cooks found in travel radius. The request will be approved without notifying anyone.',
                            }[locale]
                        }
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
                                {{ de: 'Alle auswählen', en: 'Select all' }[locale]}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy || selectedCookIds.length === 0}
                                onClick={() => onSelectedCookIdsChange([])}
                            >
                                {{ de: 'Keine', en: 'Clear' }[locale]}
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
                                                    <Badge variant="secondary">
                                                        {{ de: 'Bereits benachrichtigt', en: 'Already notified' }[locale]}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {[
                                                    city,
                                                    row.cook.cuisineStyle,
                                                    `${formatTravelDistanceKm(row.estimatedTravelDistanceKm, locale)} km`,
                                                    {
                                                        de: `Reise ca. ${formatCurrency(row.estimatedTravelExpensesCents, { locale, maximumFractionDigits: 0 })}`,
                                                        en: `Travel ~${formatCurrency(row.estimatedTravelExpensesCents, { locale, maximumFractionDigits: 0 })}`,
                                                    }[locale],
                                                    {
                                                        de: `Menü ~${formatCurrency(row.suggestedMenuPriceCents, { locale, maximumFractionDigits: 0 })}`,
                                                        en: `Menu ~${formatCurrency(row.suggestedMenuPriceCents, { locale, maximumFractionDigits: 0 })}`,
                                                    }[locale],
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
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="button" disabled={busy || (cooks.length > 0 && selectedCookIds.length === 0)} onClick={onConfirm}>
                        {busy
                            ? { de: 'Freigeben…', en: 'Approving…' }[locale]
                            : { de: `Freigeben (${selectedCookIds.length})`, en: `Approve (${selectedCookIds.length})` }[locale]}
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
            <h2 className="font-serif text-2xl/tight text-foreground">{{ de: 'Rabatt', en: 'Discount' }[locale]}</h2>
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
    const empty = { de: '—', en: '—' }[locale];
    const address = bookingRequest.exactEventAddress;
    const invoice = bookingRequest.invoiceAddress;

    return (
        <div className="grid gap-4">
            <dl className="grid gap-4">
                <DetailField label={{ de: 'Anfrage-ID', en: 'Request ID' }[locale]} value={bookingRequest.bookingRequestId} mono />
                <Separator />
                <div className="grid gap-2">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {{ de: 'Status', en: 'Status' }[locale]}
                    </dt>
                    <dd className="flex flex-wrap items-center gap-2">
                        <BookingStatusPill className={bookingRequestStatusClassName(bookingRequest.status)}>
                            {adminBookingRequestStatusLabel(bookingRequest.status, locale)}
                        </BookingStatusPill>
                        <Badge variant="outline">
                            {adminBookingRequestPublicationStatusLabel(bookingRequest.publicationStatus, locale)}
                        </Badge>
                    </dd>
                </div>
                <Separator />
                <DetailField label={{ de: 'Anlass', en: 'Occasion' }[locale]} value={bookingRequest.occasion} />
                <Separator />
                <DetailField
                    label={{ de: 'Termin', en: 'Event' }[locale]}
                    value={formatDateTime(bookingRequest.dateTime, { locale, timeZone, dateStyle: 'full' })}
                />
                <Separator />
                <DetailField
                    label={{ de: 'Teilnehmer', en: 'Participants' }[locale]}
                    value={formatParticipants(bookingRequest.participants, { locale })}
                />
                <Separator />
                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {{ de: 'Kunde', en: 'Customer' }[locale]}
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
                        {{ de: 'Angenommener Koch', en: 'Accepted cook' }[locale]}
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
                    label={{ de: 'Ort', en: 'Location' }[locale]}
                    value={[address.displayText, address.city, address.postCode, address.country].filter(Boolean).join(' · ') || empty}
                />
                <Separator />
                <DetailField
                    label={{ de: 'Nachricht', en: 'Message' }[locale]}
                    value={bookingRequest.adjustedMessage?.trim() || bookingRequest.originalMessage || empty}
                />
                <Separator />
                <DetailField
                    label={{ de: 'Präferenzen', en: 'Preferences' }[locale]}
                    value={bookingRequest.preferences.length > 0 ? bookingRequest.preferences.join(', ') : empty}
                />
                <Separator />
                <DetailField label={{ de: 'Preisklasse', en: 'Price class' }[locale]} value={bookingRequest.priceClassType ?? empty} />
                <Separator />
                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {{ de: 'Teilnehmer', en: 'Participants' }[locale]}
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
                    label={{ de: 'Rechnungsadresse', en: 'Invoice address' }[locale]}
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
                    label={{ de: 'Erstellt', en: 'Created' }[locale]}
                    value={formatDate(bookingRequest.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                />
                <Separator />
                <DetailField
                    label={{ de: 'Läuft ab', en: 'Expires' }[locale]}
                    value={
                        bookingRequest.expiresAt ? formatDate(bookingRequest.expiresAt, { locale, timeZone, dateStyle: 'medium' }) : empty
                    }
                />
                <Separator />
                <DetailField
                    label={{ de: 'Storniert', en: 'Canceled' }[locale]}
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
                            {{ de: 'Zum Angebot', en: 'View offer' }[locale]}
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
            return {
                de: 'Keine weiteren Angebote.',
                en: 'No other offers.',
            }[locale];
        }
        if (!publicationApproved) {
            return {
                de: 'Noch keine Angebote. Angebote erscheinen, nachdem die Anfrage freigegeben und Köche benachrichtigt wurden.',
                en: 'No offers yet. Offers appear after the request is approved and chefs are notified.',
            }[locale];
        }
        if (cooksWithoutOffer.length > 0) {
            return {
                de: 'Noch keine Angebote. Benachrichtige Köche unten oder erstelle ein Angebot manuell.',
                en: 'No offers yet. Notify chefs below or create an offer manually.',
            }[locale];
        }
        if (bookingRequest.cooksInTravelRadius.length === 0) {
            return {
                de: 'Noch keine Angebote und keine Köche im Anfahrtsradius.',
                en: 'No offers yet and no chefs in travel radius.',
            }[locale];
        }
        return { de: 'Noch keine Angebote.', en: 'No offers yet.' }[locale];
    })();

    const emptyNotifiedCooksMessage = hasNotifiedCooksInTravelRadius
        ? {
              de: 'Alle benachrichtigten Köche haben ein Angebot erstellt.',
              en: 'All notified chefs have created an offer.',
          }[locale]
        : { de: 'Noch keine Köche benachrichtigt.', en: 'No chefs notified yet.' }[locale];

    const emptyNotNotifiedCooksMessage =
        bookingRequest.cooksInTravelRadius.length === 0
            ? { de: 'Keine Köche im Anfahrtsradius.', en: 'No chefs in travel radius.' }[locale]
            : {
                  de: 'Alle Köche im Anfahrtsradius wurden benachrichtigt.',
                  en: 'All chefs in travel radius have been notified.',
              }[locale];

    async function onConfirmNotifyCook() {
        if (pendingNotifyCookId == null) {
            return;
        }
        const cookId = pendingNotifyCookId;
        setNotifyBusyCookId(cookId);
        try {
            const result = await notifyCooks({ bookingRequestId, cookIds: [cookId] });
            if (result.error || !result.data?.admin.bookingRequestCooksNotify.success) {
                toast.error(
                    {
                        de: 'Benachrichtigung fehlgeschlagen. Bitte erneut versuchen.',
                        en: 'Notification failed. Please try again.',
                    }[locale],
                );
                return;
            }
            toast.success(
                {
                    de: 'Koch benachrichtigt.',
                    en: 'Chef notified.',
                }[locale],
            );
            setPendingNotifyCookId(null);
        } finally {
            setNotifyBusyCookId(null);
        }
    }

    return (
        <div className="grid gap-8">
            {acceptedOffer ? (
                <section className="grid gap-3">
                    <h2 className="text-base font-semibold">{{ de: 'Angenommenes Angebot', en: 'Accepted offer' }[locale]}</h2>
                    <div className="grid max-w-sm">
                        <AdminBookingRequestOfferCard bookingRequestId={bookingRequestId} offer={acceptedOffer} />
                    </div>
                </section>
            ) : null}

            <section className="grid gap-3">
                <h2 className="text-base font-semibold">
                    {{ de: 'Köche die Angebote erstellt haben', en: 'Chefs who created offers' }[locale]}
                </h2>
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
                <h2 className="text-base font-semibold">
                    {{ de: 'Benachrichtigte Köche ohne Angebot', en: 'Notified chefs without an offer' }[locale]}
                </h2>
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
                <h2 className="text-base font-semibold">
                    {
                        {
                            de: 'Köche im Anfahrtsradius (noch nicht benachrichtigt)',
                            en: 'Chefs in travel radius (not yet notified)',
                        }[locale]
                    }
                </h2>
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
                                ? {
                                      de: `${pendingNotifyCookName} erneut benachrichtigen?`,
                                      en: `Notify ${pendingNotifyCookName} again?`,
                                  }[locale]
                                : {
                                      de: `${pendingNotifyCookName} diese Anfrage vorschlagen?`,
                                      en: `Suggest this request to ${pendingNotifyCookName}?`,
                                  }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingNotifyAlreadyNotified
                                ? {
                                      de: 'Der Koch erhält eine weitere E-Mail und einen Live-Hinweis zu dieser Anfrage. Er kann weiterhin ein Angebot erstellen.',
                                      en: 'The chef receives another email and a live update about this request. They can still create an offer.',
                                  }[locale]
                                : {
                                      de: 'Der Koch erhält eine E-Mail und sieht die Anfrage in seinem Buchungsanfragen-Pool. Er kann dann ein Angebot erstellen.',
                                      en: 'The chef receives an email and sees the request in their booking request pool. They can then create an offer.',
                                  }[locale]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={notifyBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={notifyBusy}
                            onClick={(event) => {
                                event.preventDefault();
                                void onConfirmNotifyCook();
                            }}
                        >
                            {notifyBusy
                                ? { de: 'Senden…', en: 'Sending…' }[locale]
                                : pendingNotifyAlreadyNotified
                                  ? { de: 'Erneut benachrichtigen', en: 'Send again' }[locale]
                                  : { de: 'Vorschlagen', en: 'Suggest' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className={`text-sm text-foreground ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</dd>
        </div>
    );
}
