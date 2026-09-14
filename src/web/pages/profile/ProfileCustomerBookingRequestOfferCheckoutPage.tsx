import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { ListRestartIcon, MapPinIcon, SquareArrowOutUpRightIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatCurrency, toStripeCountryCode, userDisplayName } from '../../../shared';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { CookProfileTags } from '../../components/CookProfileTags';
import type {
    GqlCInvoiceAddressInput,
    GqlCProfileCustomerBookingRequestOfferCheckoutPageQuery,
    GqlCProfileCustomerBookingRequestOfferCheckoutPageUserFragment,
} from '../../graphql/generated';
import {
    ProfileCustomerBookingRequestOfferCheckoutPageUpdatesDocument,
    ProfileCustomerBookingRequestOfferPaymentStatusUpdateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
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
                                to="/{-$locale}/chefs/$cookId"
                                params={{ cookId: cook.cookId }}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex text-muted-foreground hover:text-foreground"
                                aria-label={
                                    {
                                        de: 'Öffentliche Kochseite öffnen',
                                        en: 'Open public cook page',
                                    }[locale]
                                }
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
    const courseLabel = {
        de: courseCount === 1 ? '1 Gang' : `${courseCount} Gänge`,
        en: courseCount === 1 ? '1 course' : `${courseCount} courses`,
    }[locale];

    return (
        <section className="grid gap-1 rounded-lg border border-border bg-secondary/40 p-4">
            <h2 className="font-serif text-xl/tight wrap-break-word text-foreground">{menu.title}</h2>
            <p className="text-sm text-muted-foreground">{courseLabel}</p>
        </section>
    );
}

function OfferCostSummary({ offer, locale }: { offer: CheckoutOffer; locale: Locale }) {
    const lines = offer.costBreakdown.lineItems;
    const total = offer.costBreakdown.total;
    const beforeDiscount = offer.costBreakdown.totalBeforeDiscount;

    return (
        <div className="grid gap-2 rounded-lg border border-border bg-secondary/40 p-4 text-sm">
            {lines.map((line) => (
                <div key={line.title} className="flex items-baseline justify-between gap-4">
                    <span className="text-muted-foreground">{line.title}</span>
                    <span className="font-medium tabular-nums">
                        {formatCurrency(line.amountCents, { locale, maximumFractionDigits: 0 })}
                    </span>
                </div>
            ))}
            {beforeDiscount ? (
                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 text-muted-foreground">
                    <span>{beforeDiscount.title}</span>
                    <span className="tabular-nums">{formatCurrency(beforeDiscount.amountCents, { locale, maximumFractionDigits: 0 })}</span>
                </div>
            ) : null}
            {total ? (
                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 font-medium">
                    <span>{total.title}</span>
                    <span className="tabular-nums">{formatCurrency(total.amountCents, { locale, maximumFractionDigits: 0 })}</span>
                </div>
            ) : null}
        </div>
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
    const canPay = needsDepositPayment && liveOffer.payment != null;
    const paymentUnavailable = needsDepositPayment && liveOffer.payment == null;

    const offerHref = {
        to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId' as const,
        params: { bookingRequestId, bookingRequestOfferId },
    };

    function applyEventAddressAsInvoice() {
        const eventAddress = liveRequest.exactEventAddress;
        const country = toStripeCountryCode(eventAddress.country);
        if (!country) {
            toast.error(
                {
                    de: 'Veranstaltungsadresse hat kein gültiges Land für die Rechnung.',
                    en: 'Event address has no valid country for billing.',
                }[locale],
            );
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
            toast.success(
                {
                    de: liveOffer.payment?.type === 'SETUP_INTENT' ? 'Zahlungsdaten gespeichert.' : 'Zahlung erfolgreich.',
                    en: liveOffer.payment?.type === 'SETUP_INTENT' ? 'Payment details saved.' : 'Payment successful.',
                }[locale],
            );
            void navigate({ ...offerHref, search: { tab: 'offer' } });
        } catch {
            toast.error({ de: 'Zahlung konnte nicht abgeschlossen werden.', en: 'Could not complete payment.' }[locale]);
        } finally {
            setPaymentBusy(false);
            setConfirmPayment(false);
        }
    }

    function onPaymentFailure(message?: string) {
        setPaymentBusy(false);
        setConfirmPayment(false);
        toast.error(message ?? { de: 'Zahlung fehlgeschlagen.', en: 'Payment failed.' }[locale]);
    }

    const paymentConfirmLabel =
        liveOffer.payment?.type === 'SETUP_INTENT'
            ? {
                  de: paymentBusy || confirmPayment ? 'Wird gespeichert…' : 'Zahlungsdaten vormerken',
                  en: paymentBusy || confirmPayment ? 'Saving…' : 'Store payment details',
              }[locale]
            : {
                  de: paymentBusy || confirmPayment ? 'Wird bestätigt…' : 'Jetzt bezahlen',
                  en: paymentBusy || confirmPayment ? 'Confirming…' : 'Pay now',
              }[locale];

    const description = {
        de:
            liveOffer.payment?.type === 'SETUP_INTENT'
                ? 'Hinterlege deine Kartendaten. Wir belasten dich erst kurz vor dem Event.'
                : 'Schließe die Zahlung ab, um die Buchung zu bestätigen.',
        en:
            liveOffer.payment?.type === 'SETUP_INTENT'
                ? 'Save your card details. We charge you shortly before the event.'
                : 'Complete payment to confirm the booking.',
    }[locale];

    return (
        <main
            id="main-content"
            data-workspace-fill=""
            className="@container flex min-h-0 w-[calc(100%+2rem)] max-w-none flex-1 -mx-4 flex-col overflow-hidden"
        >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
                <div className="grid w-full max-w-5xl content-start gap-8">
                    <div className="grid gap-1">
                        <h1 className="font-serif text-3xl/tight text-foreground">
                            {profileCustomerBookingRequestOfferCheckoutPageTitle[locale]}
                        </h1>
                        {canPay ? <p className="text-muted-foreground">{description}</p> : null}
                    </div>

                    {!needsDepositPayment ? (
                        <StatusAlert tone="info" title={{ de: 'Keine Zahlung nötig', en: 'No payment needed' }[locale]}>
                            {
                                {
                                    de: 'Für dieses Angebot ist gerade kein Checkout erforderlich.',
                                    en: 'Checkout is not required for this offer right now.',
                                }[locale]
                            }
                        </StatusAlert>
                    ) : null}

                    {paymentUnavailable ? (
                        <StatusAlert tone="error" title={{ de: 'Checkout nicht verfügbar', en: 'Checkout unavailable' }[locale]}>
                            {
                                {
                                    de: 'Die Zahlung wurde vorbereitet, aber der Stripe Publishable Key fehlt in der Server-Konfiguration.',
                                    en: 'Payment was prepared, but the Stripe publishable key is missing from the server configuration.',
                                }[locale]
                            }
                        </StatusAlert>
                    ) : null}

                    {canPay && liveOffer.payment ? (
                        <div className="grid items-start gap-8 @3xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                            <aside className="grid gap-4 @3xl:sticky @3xl:top-0">
                                <CheckoutCookSummary cook={liveOffer.cook} locale={locale} />
                                {liveOffer.configuredMenu != null ? (
                                    <CheckoutMenuSummary menu={liveOffer.configuredMenu} locale={locale} />
                                ) : null}
                                <OfferCostSummary offer={liveOffer} locale={locale} />
                            </aside>

                            <div className="grid gap-4">
                                <Suspense fallback={<div className="min-h-40 animate-pulse rounded-md bg-muted/40" aria-hidden />}>
                                    <StripePaymentPanel
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
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={applyEventAddressAsInvoice}
                                                    disabled={paymentBusy}
                                                >
                                                    <ListRestartIcon aria-hidden />
                                                    {
                                                        {
                                                            de: 'Veranstaltungsadresse als Rechnungsadresse verwenden',
                                                            en: 'Use event address as invoice address',
                                                        }[locale]
                                                    }
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
