import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { ListRestartIcon, MapPinIcon, SquareArrowOutUpRightIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { toStripeCountryCode, userDisplayName } from '../../../shared';
import { bookingRequestCheckoutFunnelArea } from '../../../shared/bookingRequestCheckoutFunnel';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { BookingRequestOfferAddonSelectionList } from '../../components/BookingRequestOfferAddonSelectionList';
import { CookMenuCardMedia } from '../../components/CookMenuCard';
import { CookProfileTags } from '../../components/CookProfileTags';
import { CostBreakdownPanel } from '../../components/CostBreakdownPanel';
import type {
    GqlCInvoiceAddressInput,
    GqlCProfileCustomerBookingRequestOfferCheckoutPageQuery,
    GqlCProfileCustomerBookingRequestOfferCheckoutPageUserFragment,
} from '../../graphql/generated';
import {
    BookingRequestCheckoutFunnelTrackDocument,
    ProfileCustomerBookingRequestOfferCheckoutPageUpdatesDocument,
    ProfileCustomerBookingRequestOfferPaymentStatusUpdateDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { bookingPaymentPullIsPast } from '../../utils/bookingPaymentPullIsPast';
import type { Locale } from '../../utils/locale';

import { profileCustomerBookingRequestOfferCheckoutPageTitle } from './profileCustomerBookingRequestOfferLabels';

export {
    profileCustomerBookingRequestOfferCheckoutPageDescription,
    profileCustomerBookingRequestOfferCheckoutPageTitle,
} from './profileCustomerBookingRequestOfferLabels';

const StripePaymentPanel = lazy(async () => {
    const mod = await import('../../components/StripePaymentPanel');
    return { default: mod.StripePaymentPanel };
});

export function profileCustomerBookingRequestOfferCheckoutPageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

function invoiceAddressEmpty(seed?: { firstName?: string; lastName?: string }): GqlCInvoiceAddressInput {
    return {
        companyName: '',
        firstName: seed?.firstName ?? '',
        lastName: seed?.lastName ?? '',
        country: '',
        city: '',
        postalCode: '',
        line1: '',
        line2: '',
    };
}

type CheckoutOffer = NonNullable<
    NonNullable<GqlCProfileCustomerBookingRequestOfferCheckoutPageUserFragment['bookingRequest']>['offers']
>[number];
type CheckoutRequest = NonNullable<GqlCProfileCustomerBookingRequestOfferCheckoutPageUserFragment['bookingRequest']>;

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function CheckoutCookSummary({ cook, locale }: { cook: CheckoutOffer['cook']; locale: Locale }) {
    const city = cook.city?.trim() ?? '';

    return (
        <section className="grid gap-3 rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex items-start gap-3">
                <Avatar className="size-14 shrink-0 text-base">
                    {cook.user.profilePicture != null ? <AvatarImage src={cook.user.profilePicture.url} alt="" /> : null}
                    <AvatarFallback>{initialsFromDisplay(cook.user.display)}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-xl/tight text-foreground">{cook.user.display}</h2>
                        {cook.hasPublicProfile ? (
                            <Link
                                to="/{-$locale}/chefs/$pathName"
                                params={{ pathName: cook.pathName }}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex text-muted-foreground hover:text-foreground"
                                aria-label={t(locale, 'profileCustomer', 'checkout.openCookPage')}
                            >
                                <SquareArrowOutUpRightIcon aria-hidden className="size-4" />
                            </Link>
                        ) : null}
                    </div>
                    {city.length > 0 ? (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPinIcon aria-hidden className="size-4 shrink-0" />
                            <span>{city}</span>
                        </p>
                    ) : null}
                    <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} />
                </div>
            </div>
        </section>
    );
}

function CheckoutMenuSummary({ menu, locale }: { menu: NonNullable<CheckoutOffer['configuredMenu']>; locale: Locale }) {
    const courseCount = menu.courses.length;
    const courseLabel = t(locale, 'profileCustomer', 'checkout.coursesCount', { count: courseCount });
    const images = menu.courses
        .flatMap((course) => course.meals.map((meal) => meal.mealImageUrl))
        .filter((url): url is string => url != null && url.length > 0);

    return (
        <section className="flex items-stretch gap-3 rounded-lg border border-border bg-secondary/40 p-4">
            <CookMenuCardMedia images={images} />
            <div className="grid min-w-0 flex-1 content-center gap-1">
                <h2 className="font-serif text-xl/tight wrap-break-word text-foreground">{menu.title}</h2>
                <p className="text-sm text-muted-foreground">{courseLabel}</p>
            </div>
        </section>
    );
}

function OfferCostSummary({ offer, locale }: { offer: CheckoutOffer; locale: Locale }) {
    return (
        <CostBreakdownPanel
            className="rounded-lg border border-border bg-secondary/40 p-4"
            locale={locale}
            lineItems={offer.costBreakdown.lineItems}
            totalBeforeDiscount={offer.costBreakdown.totalBeforeDiscount}
            total={offer.costBreakdown.total}
        />
    );
}

function invoiceAddressFromRequest(
    request: CheckoutRequest,
    customer: GqlCProfileCustomerBookingRequestOfferCheckoutPageUserFragment,
): GqlCInvoiceAddressInput {
    const existing = request.invoiceAddress;
    if (existing) {
        return {
            companyName: existing.companyName ?? '',
            firstName: existing.firstName,
            lastName: existing.lastName,
            country: toStripeCountryCode(existing.country) || existing.country,
            city: existing.city,
            postalCode: existing.postalCode,
            line1: existing.line1,
            line2: existing.line2,
        };
    }
    return invoiceAddressEmpty({ firstName: customer.firstName, lastName: customer.lastName });
}

export function ProfileCustomerBookingRequestOfferCheckoutPage({
    data,
    bookingRequestId,
    bookingRequestOfferId,
}: {
    data: GqlCProfileCustomerBookingRequestOfferCheckoutPageQuery;
    bookingRequestId: string;
    bookingRequestOfferId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const offerAddonsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_ADDONS');
    const seedUser = data.currentSession.user ?? null;
    const seedRequest = seedUser?.bookingRequest ?? null;
    const seedOffer = seedRequest?.offers.find((entry) => entry.bookingRequestOfferId === bookingRequestOfferId) ?? null;
    if (!seedUser || !seedRequest || !seedOffer) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCustomerBookingRequestOfferCheckoutPageUpdatesDocument, { bookingRequestId });
    const customerUser = user ?? seedUser;
    const request = customerUser.bookingRequest ?? null;
    const offer = request?.offers.find((entry) => entry.bookingRequestOfferId === bookingRequestOfferId) ?? null;

    const [invoiceAddress, setInvoiceAddress] = useState<GqlCInvoiceAddressInput>(() => invoiceAddressFromRequest(seedRequest, seedUser));
    const [addressElementKey, setAddressElementKey] = useState(0);
    const [confirmPayment, setConfirmPayment] = useState(false);
    const [paymentBusy, setPaymentBusy] = useState(false);

    const [, paymentStatusUpdate] = useMutation(ProfileCustomerBookingRequestOfferPaymentStatusUpdateDocument);
    const [, trackFunnelInteraction] = useMutation(BookingRequestCheckoutFunnelTrackDocument);
    const checkoutEnteredRef = useRef(false);

    const trackCheckoutEntered = useEffectEvent(() => {
        if (checkoutEnteredRef.current) return;
        checkoutEnteredRef.current = true;
        void trackFunnelInteraction({
            input: {
                webPageKey: 'PROFILE',
                area: bookingRequestCheckoutFunnelArea,
                bookingRequestId,
                interaction: { type: 'step_entered', step: 'checkout' },
            },
        });
    });

    useEffect(() => {
        trackCheckoutEntered();
    }, []);

    useEffect(() => {
        if (user == null) return;
        if (request == null || offer == null) {
            void navigate({
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                params: { bookingRequestId, bookingRequestOfferId },
            });
        }
    }, [bookingRequestId, bookingRequestOfferId, navigate, offer, request, user]);

    if (request == null || offer == null) {
        return null;
    }

    const liveRequest = request;
    const liveOffer = offer;

    const needsDepositPayment = liveOffer.status === 'USER_NEEDS_DEPOSIT_PAYMENT';
    const paymentFailed = liveOffer.paymentStatus === 'FAILED';
    // Also covers PAYED offers with `pendingDeltaPayment` (amendment increase without reusable PM).
    const canPay = liveOffer.payment != null && (needsDepositPayment || liveOffer.status === 'EVENT_PENDING');
    const paymentUnavailable = needsDepositPayment && liveOffer.payment == null;
    const pullIsPast = bookingPaymentPullIsPast(liveOffer.plannedPaymentPullDateTime);
    const isSetupIntent = liveOffer.payment?.type === 'SETUP_INTENT';

    const offerHref = {
        to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId' as const,
        params: { bookingRequestId, bookingRequestOfferId },
    };

    function applyEventAddressAsInvoice() {
        const eventAddress = liveRequest.exactEventAddress;
        const country = toStripeCountryCode(eventAddress.country);
        if (!country) {
            toast.error(t(locale, 'profileCustomer', 'checkout.invalidCountry'));
            return;
        }
        setInvoiceAddress((previous) => ({
            companyName: previous.companyName,
            firstName: previous.firstName || customerUser.firstName,
            lastName: previous.lastName || customerUser.lastName,
            country,
            city: eventAddress.city,
            postalCode: eventAddress.postCode,
            line1: eventAddress.addressLine1,
            line2: eventAddress.addressLine2,
        }));
        setAddressElementKey((key) => key + 1);
    }

    async function onPaymentSuccess() {
        setPaymentBusy(true);
        try {
            const result = await paymentStatusUpdate({
                bookingRequestOfferId,
                invoiceAddress: {
                    ...invoiceAddress,
                    companyName: invoiceAddress.companyName || '',
                    line2: invoiceAddress.line2 || '',
                    country: toStripeCountryCode(invoiceAddress.country) || invoiceAddress.country,
                },
            });
            if (!result.data?.user.bookingRequestOfferPaymentStatusUpdate.success) {
                throw new Error('payment status update failed');
            }
            void trackFunnelInteraction({
                input: {
                    webPageKey: 'PROFILE',
                    area: bookingRequestCheckoutFunnelArea,
                    bookingRequestId,
                    interaction: { type: 'step_completed', step: 'checkout' },
                },
            });
            toast.success(
                liveOffer.payment?.type === 'SETUP_INTENT'
                    ? pullIsPast
                        ? t(locale, 'profileCustomer', 'checkout.toastSetupSavedChargeSoon')
                        : t(locale, 'profileCustomer', 'checkout.toastSetupSaved')
                    : t(locale, 'profileCustomer', 'checkout.toastChargeSuccess'),
            );
            void navigate({ ...offerHref, search: { tab: 'offer' } });
        } catch {
            toast.error(t(locale, 'profileCustomer', 'checkout.completeFailed'));
        } finally {
            setPaymentBusy(false);
            setConfirmPayment(false);
        }
    }

    function onPaymentFailure(message?: string) {
        setPaymentBusy(false);
        setConfirmPayment(false);
        toast.error(message ?? t(locale, 'profileCustomer', 'checkout.paymentFailed'));
    }

    const paymentBusyState = paymentBusy || confirmPayment;
    const paymentConfirmLabel = isSetupIntent
        ? paymentBusyState
            ? t(locale, 'profileCustomer', 'checkout.saving')
            : t(locale, 'profileCustomer', 'checkout.savePayment')
        : paymentBusyState
          ? t(locale, 'profileCustomer', 'checkout.confirming')
          : t(locale, 'profileCustomer', 'checkout.payNow');

    const description = isSetupIntent
        ? pullIsPast
            ? t(locale, 'profileCustomer', 'checkout.setupChargeSoon')
            : t(locale, 'profileCustomer', 'checkout.setupBeforeEvent')
        : t(locale, 'profileCustomer', 'checkout.completeToConfirm');

    return (
        <main
            id="main-content"
            data-workspace-fill=""
            className="@container flex min-h-0 w-[calc(100%+2rem)] max-w-none flex-1 -mx-4 flex-col overflow-hidden"
        >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
                <div className="grid w-full max-w-6xl content-start gap-8">
                    <div className="grid gap-1">
                        <h1 className="font-serif text-3xl/tight text-foreground">
                            {profileCustomerBookingRequestOfferCheckoutPageTitle(locale)}
                        </h1>
                        {canPay ? <p className="text-muted-foreground">{description}</p> : null}
                    </div>

                    {paymentFailed ? (
                        <StatusAlert tone="error" title={t(locale, 'profileCustomer', 'checkout.paymentAttemptFailed')}>
                            {t(locale, 'profileCustomer', 'checkout.paymentAttemptFailedBody')}
                        </StatusAlert>
                    ) : null}

                    {!canPay && !paymentUnavailable && !paymentFailed ? (
                        <StatusAlert tone="info" title={t(locale, 'profileCustomer', 'checkout.noPaymentNeeded')}>
                            {t(locale, 'profileCustomer', 'checkout.noPaymentNeededBody')}
                        </StatusAlert>
                    ) : null}

                    {paymentUnavailable ? (
                        <StatusAlert tone="error" title={t(locale, 'profileCustomer', 'checkout.unavailable')}>
                            {t(locale, 'profileCustomer', 'checkout.unavailableBody')}
                        </StatusAlert>
                    ) : null}

                    {canPay && liveOffer.payment ? (
                        <div className="grid items-start gap-8 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                            <aside className="grid gap-4 @3xl:sticky @3xl:top-0">
                                <CheckoutCookSummary cook={liveOffer.cook} locale={locale} />
                                {liveOffer.configuredMenu != null ? (
                                    <CheckoutMenuSummary menu={liveOffer.configuredMenu} locale={locale} />
                                ) : null}
                                {offerAddonsEnabled && liveOffer.addons.length > 0 && liveOffer.paymentStatus === 'EMPTY' ? (
                                    <BookingRequestOfferAddonSelectionList
                                        bookingRequestOfferId={bookingRequestOfferId}
                                        addons={liveOffer.addons}
                                        compact
                                        heading={t(locale, 'common', 'costBreakdown.extras')}
                                        description={t(locale, 'profileCustomer', 'checkout.extrasHint')}
                                    />
                                ) : null}
                                <OfferCostSummary offer={liveOffer} locale={locale} />
                            </aside>

                            <div className="grid gap-4">
                                <Suspense fallback={<div className="min-h-40 animate-pulse rounded-md bg-muted/40" aria-hidden />}>
                                    <StripePaymentPanel
                                        key={liveOffer.payment.clientSecret}
                                        kind={liveOffer.payment.type}
                                        clientSecret={liveOffer.payment.clientSecret}
                                        publishableKey={liveOffer.payment.publishableKey}
                                        locale={locale}
                                        invoiceAddress={invoiceAddress}
                                        onInvoiceAddressChange={setInvoiceAddress}
                                        confirm={confirmPayment}
                                        onSuccess={() => void onPaymentSuccess()}
                                        onFailure={onPaymentFailure}
                                        addressElementKey={addressElementKey}
                                        defaultValues={{
                                            name: userDisplayName(customerUser),
                                            email: customerUser.emailAddress ?? undefined,
                                        }}
                                        beforeAddress={
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t(locale, 'profileCustomer', 'checkout.eventAddress')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t(locale, 'profileCustomer', 'checkout.copyIntoBilling')}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="shrink-0"
                                                    onClick={applyEventAddressAsInvoice}
                                                    disabled={paymentBusy}
                                                    aria-label={t(locale, 'profileCustomer', 'checkout.applyEventAsBilling')}
                                                >
                                                    <ListRestartIcon aria-hidden />
                                                    {t(locale, 'profileCustomer', 'checkout.apply')}
                                                </Button>
                                            </div>
                                        }
                                    />
                                </Suspense>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {canPay && liveOffer.payment ? (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-4 py-3">
                    <Button
                        type="button"
                        onClick={() => {
                            setPaymentBusy(true);
                            setConfirmPayment(true);
                        }}
                        disabled={paymentBusy || confirmPayment}
                    >
                        {paymentConfirmLabel}
                    </Button>
                </div>
            ) : null}
        </main>
    );
}
