import { Link, notFound } from '@tanstack/react-router';
import { CircleHelpIcon, HeadsetIcon, MoreHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import {
    bookingRequestKitchenDetailsDraftIsEmpty,
    bookingRequestPriceClassLabel,
    bookingRequestSettingLabel,
    formatBookingEventWhenFromCountry,
    formatParticipants,
} from '../../../shared';
import { bookingRequestStatusHue, bookingRequestStatusLabel } from '../../../shared/bookingRequestStatus';
import type { Locale } from '../../../shared/locale';
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
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/base/popover';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestDiscountEditor } from '../../components/BookingRequestDiscountEditor';
import {
    bookingRequestKitchenDetailsDraftFromGql,
    bookingRequestKitchenDetailsInputFromDraft,
    bookingRequestKitchenDetailsPhotosFromGql,
    BookingRequestKitchenDetailsSaveCard,
} from '../../components/BookingRequestKitchenDetailsFields';
import type { BookingRequestKitchenDetailsPhoto } from '../../components/BookingRequestKitchenDetailsFields';
import { BookingRequestOfferParticipantAmendmentCustomerPanel } from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import { BookingRequestOpenToOtherCooksButton } from '../../components/BookingRequestOpenToOtherCooksButton';
import {
    BookingRequestKitchenDetailsFactContent,
    bookingRequestKitchenDetailsHasFacts,
} from '../../components/BookingRequestVenueConditionsFacts';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import { BookingWhenLabel } from '../../components/BookingWhenLabel';
import { CustomerBookingRequestOfferCard } from '../../components/CustomerBookingRequestOfferCard';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import { UserBookingRequestChurnDialog } from '../../components/UserBookingRequestChurnDialog';
import type { GqlCProfileCustomerBookingRequestPageQuery } from '../../graphql/generated';
import {
    ProfileBookingRequestCancelDocument,
    ProfileBookingRequestDiscountUpdateDocument,
    ProfileCustomerBookingRequestKitchenDetailsUpdateDocument,
    ProfileCustomerBookingRequestPageUpdatesDocument,
    ProfileCustomerBookingRequestParticipantAmendmentCancelDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cn } from '../../utils/cn';

export function profileCustomerBookingRequestPageTitle(locale: Locale): string {
    return t(locale, 'profileCustomer', 'chrome.bookingRequest');
}
export function profileCustomerBookingRequestPageDescription(locale: Locale): string {
    return t(locale, 'profileCustomer', 'bookingRequest.description');
}

const CANCELABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW', 'EXPIRED']);
const UPDATABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW']);

function requestedCookIdentity(
    cook: {
        pathName: string;
        hasPublicProfile: boolean;
        user: { display: string; profilePicture: { url: string } | null };
    },
    isExclusive: boolean,
    locale: Locale,
) {
    const subtitle = isExclusive
        ? t(locale, 'profileCustomer', 'bookingRequest.exclusiveCook')
        : t(locale, 'profileCustomer', 'bookingRequest.cookStaysOpen', { cook: cook.user.display });
    const body = (
        <>
            <Avatar>
                {cook.user.profilePicture?.url ? <AvatarImage src={cook.user.profilePicture.url} alt="" className="object-cover" /> : null}
                <AvatarFallback>{initialsFromDisplay(cook.user.display)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="font-medium">{cook.user.display}</p>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
        </>
    );
    if (cook.hasPublicProfile) {
        return (
            <Link
                to="/{-$locale}/chefs/$pathName"
                params={{ pathName: cook.pathName }}
                className="flex min-w-0 items-center gap-3 underline-offset-4 hover:underline"
            >
                {body}
            </Link>
        );
    }
    return <div className="flex min-w-0 items-center gap-3">{body}</div>;
}

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function DetailField({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
    return (
        <div className={cn('grid gap-1 self-start', className)}>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="text-sm wrap-break-word text-foreground">
                {value}
                {hint != null ? <div className="mt-1 text-sm text-muted-foreground">{hint}</div> : null}
            </dd>
        </div>
    );
}

export function profileCustomerBookingRequestPageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

export function ProfileCustomerBookingRequestPage({
    data,
    bookingRequestId,
}: {
    data: GqlCProfileCustomerBookingRequestPageQuery;
    bookingRequestId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const seedUser = data.currentSession.user ?? null;
    const seedRequest = seedUser?.bookingRequest ?? null;
    if (!seedRequest) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCustomerBookingRequestPageUpdatesDocument, { bookingRequestId });
    const request = user?.bookingRequest ?? null;

    const [churnOpen, setChurnOpen] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelBusy, setCancelBusy] = useState(false);
    const [cancelError, setCancelError] = useState(false);

    const [, cancelRequest] = useMutation(ProfileBookingRequestCancelDocument);
    const [, updateDiscount] = useMutation(ProfileBookingRequestDiscountUpdateDocument);
    const [{ fetching: amendmentCancelBusy }, cancelAmendment] = useMutation(
        ProfileCustomerBookingRequestParticipantAmendmentCancelDocument,
    );
    const offerAmendmentEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_AMENDMENT');
    const kitchenEnabled = useFeatureToggleActive('BOOKING_REQUEST_KITCHEN_DETAILS');
    const [, updateKitchenDetails] = useMutation(ProfileCustomerBookingRequestKitchenDetailsUpdateDocument);
    const [kitchenDraft, setKitchenDraft] = useState(() => bookingRequestKitchenDetailsDraftFromGql(seedRequest.kitchenDetails));
    const [kitchenPhotos, setKitchenPhotos] = useState<BookingRequestKitchenDetailsPhoto[]>(() =>
        bookingRequestKitchenDetailsPhotosFromGql(seedRequest.kitchenDetails?.photos),
    );
    const [kitchenBusy, setKitchenBusy] = useState(false);
    const [kitchenError, setKitchenError] = useState<string | null>(null);

    if (request == null || user == null) {
        return null;
    }

    const canCancel = CANCELABLE_STATUSES.has(request.status) && !request.canceledAt;
    const canUpdate = UPDATABLE_STATUSES.has(request.status) && !request.canceledAt;
    const amendableOffer = request.offers.find((offer) => offer.canRequestParticipantAmendment) ?? null;
    const pendingAmendmentOffer = request.offers.find((offer) => offer.participantAmendment != null) ?? null;
    const canAmendParticipants = offerAmendmentEnabled && amendableOffer != null;
    const canEdit = canUpdate || canAmendParticipants;
    const canEditDiscount = canUpdate;
    const offers = request.offers;
    const supportRequest = request.supportRequest ?? null;
    const showFooter = canEdit || canCancel;
    const pendingAmendment = pendingAmendmentOffer?.participantAmendment ?? null;
    const pendingAmendmentOfferId = pendingAmendmentOffer?.bookingRequestOfferId ?? null;
    const statusForPill = request.canceledAt ? 'CANCELED' : request.status;
    const displayName = user.firstName.trim().length > 0 ? user.firstName : '?';
    const priceClassLabel = request.priceClassType != null ? bookingRequestPriceClassLabel(request.priceClassType, locale) : null;
    const exactAddress = request.exactEventAddress.displayText;
    const cookVisibleAddress =
        request.exactEventAddress.city.trim().length > 0 ? request.exactEventAddress.city : request.exactEventAddress.displayText;
    const hasOriginalMessage = request.originalMessage.trim().length > 0;
    const supportUnread = supportRequest?.userUnreadNotificationCount ?? 0;

    async function confirmCancel() {
        const reason = cancelReason.trim();
        if (reason.length === 0 || cancelBusy) return;
        setCancelBusy(true);
        setCancelError(false);
        try {
            const result = await cancelRequest({ bookingRequestId, reason });
            if (!result.data?.user.bookingRequestCancel.success) {
                setCancelError(true);
                return;
            }
            setCancelConfirmOpen(false);
            setChurnOpen(false);
            toast.success(t(locale, 'profileCustomer', 'bookingRequest.cancelled'));
        } catch {
            setCancelError(true);
        } finally {
            setCancelBusy(false);
        }
    }

    return (
        <>
            <ProfilePinnedFooterLayout
                className="@container min-w-0"
                contentClassName="grid w-full min-w-0 content-start gap-6"
                footer={
                    showFooter ? (
                        <>
                            {canCancel ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label={t(locale, 'profileCustomer', 'actions.moreActions')}
                                        >
                                            <MoreHorizontalIcon className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem variant="destructive" onSelect={() => setChurnOpen(true)}>
                                            {t(locale, 'profileCustomer', 'bookingRequest.cancelRequest')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : null}
                            {canEdit ? (
                                <Button type="button" asChild>
                                    <Link to="/{-$locale}/profile/booking-requests/$bookingRequestId/edit" params={{ bookingRequestId }}>
                                        {canUpdate
                                            ? t(locale, 'profileCustomer', 'actions.edit')
                                            : t(locale, 'profileCustomer', 'bookingRequest.changeBooking')}
                                    </Link>
                                </Button>
                            ) : null}
                        </>
                    ) : undefined
                }
            >
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                        {supportRequest != null ? (
                            <Link
                                to="/{-$locale}/profile/support-requests/$supportRequestId"
                                params={{ supportRequestId: supportRequest.supportRequestId }}
                            >
                                <HeadsetIcon className="size-4" />
                                {t(locale, 'profileCustomer', 'bookingRequest.openSupport')}
                                {supportUnread > 0 ? (
                                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-medium">
                                        {supportUnread}
                                    </Badge>
                                ) : null}
                            </Link>
                        ) : (
                            <Link to="/{-$locale}/profile/support-requests/create" search={{ bookingRequestId }}>
                                <HeadsetIcon className="size-4" />
                                {t(locale, 'profileCustomer', 'nav.supportRequests.title')}
                            </Link>
                        )}
                    </Button>
                    <BookingStatusPill hue={bookingRequestStatusHue(statusForPill)} className="w-fit">
                        {bookingRequestStatusLabel(statusForPill, locale, 'customer')}
                    </BookingStatusPill>
                </div>

                {request.requestedCook ? (
                    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                        <div className="grid min-w-0 gap-1">
                            {requestedCookIdentity(request.requestedCook, request.isExclusive, locale)}
                            {request.requestedMenu ? (
                                <p className="text-sm text-muted-foreground">
                                    {t(locale, 'profileCustomer', 'bookingRequest.requestedMenu', { title: request.requestedMenu.title })}
                                </p>
                            ) : null}
                        </div>
                        {request.isExclusive ? (
                            <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">
                                {request.directRequestNeedsExpansion ? (
                                    <StatusAlert tone="warning">
                                        {t(locale, 'profileCustomer', 'bookingRequest.requestedCookUnavailable', {
                                            cook: request.requestedCook.user.display,
                                        })}
                                    </StatusAlert>
                                ) : null}
                                <BookingRequestOpenToOtherCooksButton
                                    bookingRequestId={bookingRequestId}
                                    cookFirstName={request.requestedCook.user.display}
                                    prominence={request.directRequestNeedsExpansion ? 'primary' : 'secondary'}
                                />
                            </div>
                        ) : null}
                    </section>
                ) : null}

                {pendingAmendment != null && pendingAmendmentOfferId != null ? (
                    <BookingRequestOfferParticipantAmendmentCustomerPanel
                        locale={locale}
                        canRequest={false}
                        preparationsCompletedAt={null}
                        amendment={pendingAmendment}
                        currentParticipants={request.participants}
                        bookingRequestId={bookingRequestId}
                        cancelBusy={amendmentCancelBusy}
                        onCancelAmendment={async () => {
                            const result = await cancelAmendment({ bookingRequestOfferId: pendingAmendmentOfferId });
                            if (result.error || !result.data?.user.bookingRequestOfferParticipantAmendmentCancel.success) {
                                toast.error(t(locale, 'profileCustomer', 'offer.proposalWithdrawFailed'));
                                return;
                            }
                            toast.success(t(locale, 'profileCustomer', 'offer.proposalWithdrawn'));
                        }}
                    />
                ) : null}

                <section className="grid gap-4">
                    <h2 className="font-serif text-2xl/tight text-foreground">{t(locale, 'profileCustomer', 'bookingRequest.offers')}</h2>
                    {request.status === 'OFFERS_WAITING_FOR_REVIEW' && offers.length > 0 ? (
                        <StatusAlert tone="info" title={t(locale, 'profileCustomer', 'bookingRequest.offersHint')}>
                            {t(locale, 'profileCustomer', 'bookingRequest.offersReceived', { count: offers.length })}
                        </StatusAlert>
                    ) : null}
                    {offers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCustomer', 'bookingRequest.noOffers')}</p>
                    ) : (
                        <ul className="grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
                            {offers.map((offer) => (
                                <li key={offer.bookingRequestOfferId} className="min-w-0">
                                    <CustomerBookingRequestOfferCard bookingRequestId={bookingRequestId} offer={offer} />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <div
                    className={cn(
                        'grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm',
                        hasOriginalMessage && '@xl:grid-cols-3 @xl:items-start',
                    )}
                >
                    <dl className={cn('grid gap-4 @md:grid-cols-2', hasOriginalMessage && '@xl:col-span-2')}>
                        <DetailField label={t(locale, 'profileCustomer', 'bookingRequestEdit.occasion')} value={request.occasion} />
                        <DetailField
                            label={t(locale, 'profileCustomer', 'bookingRequest.participants')}
                            value={formatParticipants(request.participants, { locale })}
                        />
                        {request.participants.some((participant) => participant.restrictions.length > 0) ? (
                            <DetailField
                                label={t(locale, 'profileCustomer', 'bookingRequestEdit.restrictions')}
                                value={
                                    <ul className="grid gap-1">
                                        {request.participants
                                            .filter((participant) => participant.restrictions.length > 0)
                                            .map((participant) => (
                                                <li key={participant.bookingRequestParticipantId}>
                                                    <span className="font-medium">{participant.name}:</span>{' '}
                                                    {participant.restrictions.join(', ')}
                                                </li>
                                            ))}
                                    </ul>
                                }
                            />
                        ) : null}
                        <DetailField
                            label={t(locale, 'profileCustomer', 'bookingRequestEdit.dateTime')}
                            value={
                                <BookingWhenLabel
                                    {...formatBookingEventWhenFromCountry({
                                        instant: request.dateTime,
                                        locale,
                                        viewerTimeZone: timeZone,
                                        venueCountry: request.exactEventAddress.country,
                                        venueCity: request.exactEventAddress.city,
                                    })}
                                />
                            }
                        />
                        <DetailField
                            label={t(locale, 'profileCustomer', 'bookingRequestEdit.preferences')}
                            value={
                                request.preferences.length > 0
                                    ? request.preferences.join(', ')
                                    : t(locale, 'profileCustomer', 'bookingRequest.noPreferences')
                            }
                        />
                        {priceClassLabel != null ? (
                            <DetailField label={t(locale, 'profileCustomer', 'bookingRequest.priceClass')} value={priceClassLabel} />
                        ) : null}
                        <DetailField
                            label={t(locale, 'profileCustomer', 'bookingRequestEdit.venue')}
                            value={exactAddress}
                            hint={
                                <p className="flex items-center gap-1">
                                    <span>{t(locale, 'profileCustomer', 'bookingRequest.cooksSee', { address: cookVisibleAddress })}</span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                className="text-muted-foreground"
                                                aria-label={t(locale, 'profileCustomer', 'bookingRequest.addressVisibilityMore')}
                                            >
                                                <CircleHelpIcon />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-72 text-sm text-muted-foreground">
                                            {t(locale, 'profileCustomer', 'bookingRequest.addressVisibilityBody')}
                                        </PopoverContent>
                                    </Popover>
                                </p>
                            }
                        />
                        {bookingRequestKitchenDetailsHasFacts(request.kitchenDetails, locale) ? (
                            <DetailField
                                className={(request.kitchenDetails?.photos.length ?? 0) > 0 ? '@md:col-span-2' : undefined}
                                label={t(locale, 'profileCustomer', 'bookingRequestEdit.aboutKitchen')}
                                value={<BookingRequestKitchenDetailsFactContent details={request.kitchenDetails} locale={locale} />}
                            />
                        ) : null}
                        {request.setting != null ? (
                            <DetailField
                                label={t(locale, 'profileCustomer', 'bookingRequest.whereYouDine')}
                                value={bookingRequestSettingLabel(request.setting, locale)}
                            />
                        ) : null}
                        {request.canceledAt && request.cancellationReason ? (
                            <DetailField
                                className="@md:col-span-2"
                                label={t(locale, 'profileCustomer', 'bookingRequest.reason')}
                                value={request.cancellationReason}
                            />
                        ) : null}
                    </dl>

                    {hasOriginalMessage ? (
                        <div className="grid min-w-0 w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2 self-start">
                            <article className="w-max max-w-full justify-self-end rounded-2xl rounded-br-sm bg-muted px-4 py-2 text-sm/relaxed whitespace-pre-wrap wrap-break-word text-foreground shadow-sm">
                                <p className="mb-0.5 truncate text-[11px] leading-tight font-semibold text-primary">{displayName}</p>
                                {request.originalMessage}
                            </article>
                            <Avatar size="sm" className="shrink-0">
                                {user.profilePicture != null ? <AvatarImage src={user.profilePicture.url} alt="" /> : null}
                                <AvatarFallback className="bg-foreground/10 text-[10px] font-semibold text-foreground/75">
                                    {initialsFromDisplay(displayName)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    ) : null}
                </div>

                {kitchenEnabled &&
                !request.canceledAt &&
                new Date(request.dateTime).getTime() > Date.now() &&
                bookingRequestKitchenDetailsDraftIsEmpty(
                    bookingRequestKitchenDetailsDraftFromGql(request.kitchenDetails),
                    request.kitchenDetails?.photos.length ?? 0,
                ) ? (
                    <BookingRequestKitchenDetailsSaveCard
                        locale={locale}
                        value={kitchenDraft}
                        photos={kitchenPhotos}
                        busy={kitchenBusy}
                        error={kitchenError}
                        onChange={setKitchenDraft}
                        onPhotosChange={setKitchenPhotos}
                        onSave={async () => {
                            setKitchenBusy(true);
                            setKitchenError(null);
                            try {
                                const result = await updateKitchenDetails({
                                    bookingRequestId,
                                    kitchenDetails: bookingRequestKitchenDetailsInputFromDraft(kitchenDraft),
                                    photoFileUploadIds: kitchenPhotos.map((photo) => photo.fileUploadId),
                                });
                                if (result.error || !result.data?.user.bookingRequestKitchenDetailsUpdate.success) {
                                    throw new Error('kitchen details update failed');
                                }
                                toast.success(t(locale, 'profileCustomer', 'bookingRequest.kitchenSaved'));
                            } catch {
                                setKitchenError(t(locale, 'profileCustomer', 'bookingRequest.kitchenSaveFailed'));
                            } finally {
                                setKitchenBusy(false);
                            }
                        }}
                    />
                ) : null}

                {canEditDiscount || request.promoCode != null || request.giftCard != null ? (
                    <section className="grid max-w-xl gap-4">
                        <h2 className="font-serif text-2xl/tight text-foreground">
                            {t(locale, 'profileCustomer', 'bookingRequest.discount')}
                        </h2>
                        <BookingRequestDiscountEditor
                            bookingRequestId={bookingRequestId}
                            locale={locale}
                            canEdit={canEditDiscount}
                            promoCode={request.promoCode}
                            giftCard={request.giftCard}
                            onDiscountUpdate={async ({ bookingRequestId: id, redeemCode }) => {
                                const result = await updateDiscount({ bookingRequestId: id, redeemCode });
                                return result.data?.user.bookingRequestDiscountUpdate.success === true;
                            }}
                        />
                    </section>
                ) : null}
            </ProfilePinnedFooterLayout>

            <UserBookingRequestChurnDialog
                bookingRequestId={bookingRequestId}
                open={churnOpen}
                onClose={() => setChurnOpen(false)}
                onProceedWithCancellation={() => {
                    setChurnOpen(false);
                    setCancelReason('');
                    setCancelError(false);
                    setCancelConfirmOpen(true);
                }}
                onDiscountApplied={() => {
                    toast.success(t(locale, 'profileCustomer', 'bookingRequest.discountApplied'));
                }}
                onRecallRequested={() => {
                    toast.success(t(locale, 'profileCustomer', 'bookingRequest.callbackReceived'));
                }}
            />

            <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'profileCustomer', 'bookingRequest.cancelTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(locale, 'profileCustomer', 'bookingRequest.cancelBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        placeholder={t(locale, 'profileCustomer', 'bookingRequest.reasonPlaceholder')}
                        rows={3}
                    />
                    {cancelError ? (
                        <p className="text-sm text-destructive" role="alert">
                            {t(locale, 'profileCustomer', 'bookingRequest.cancelFailed')}
                        </p>
                    ) : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={cancelBusy}>
                            {t(locale, 'profileCustomer', 'bookingRequest.cancelBack')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={cancelBusy || cancelReason.trim().length === 0}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmCancel();
                            }}
                        >
                            {t(locale, 'profileCustomer', 'bookingRequest.cancelPermanently')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
