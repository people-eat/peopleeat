import { Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatCurrency, formatDate, userDisplayName } from '../../shared';
import { giftCardFunnelArea } from '../../shared/giftCardFunnel';
import { Button } from '../components/base/button';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCGiftCardCheckoutPageQuery, GqlCInvoiceAddressInput } from '../graphql/generated';
import { GiftCardCheckoutPayDocument, GiftCardCheckoutSessionUpdatesDocument, GiftCardFunnelTrackDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';

const StripePaymentPanel = lazy(async () => {
    const mod = await import('../components/StripePaymentPanel');
    return { default: mod.StripePaymentPanel };
});

type CheckoutSession = GqlCGiftCardCheckoutPageQuery['currentSession'];

function invoiceAddressEmpty(): GqlCInvoiceAddressInput {
    return {
        companyName: '',
        firstName: '',
        lastName: '',
        country: '',
        city: '',
        postalCode: '',
        line1: '',
        line2: '',
    };
}

export function GiftCardCheckoutPage({
    loaderData,
    giftCardId,
}: {
    loaderData: { data: GqlCGiftCardCheckoutPageQuery };
    giftCardId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const navigate = useNavigate();

    const [session, setSession] = useState<CheckoutSession>(loaderData.data.currentSession);
    const [busy, setBusy] = useState(false);
    const [confirmPayment, setConfirmPayment] = useState(false);
    const [invoiceAddress, setInvoiceAddress] = useState<GqlCInvoiceAddressInput>(invoiceAddressEmpty());

    const [, giftCardPay] = useMutation(GiftCardCheckoutPayDocument);
    const [, trackFunnelInteraction] = useMutation(GiftCardFunnelTrackDocument);
    const checkoutEnteredRef = useRef(false);

    const trackCheckoutEntered = useEffectEvent(() => {
        if (checkoutEnteredRef.current) return;
        checkoutEnteredRef.current = true;
        void trackFunnelInteraction({
            input: {
                webPageKey: 'GIFT_CARD',
                area: giftCardFunnelArea,
                interaction: { type: 'step_entered', step: 'checkout' },
            },
        });
    });

    useEffect(() => {
        trackCheckoutEntered();
    }, []);

    useEffect(() => {
        const request = createRequest(GiftCardCheckoutSessionUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.sessionUpdates;
                if (next) setSession(next);
            }),
        );
        return unsubscribe;
    }, [client]);

    const giftCard = session.giftCard?.giftCardId === giftCardId ? session.giftCard : null;
    const preparedPayment = giftCard?.paymentStatus === 'PREPARED' && giftCard.payment ? giftCard.payment : null;
    const paid = giftCard?.paymentStatus === 'PAYED' && Boolean(giftCard.redeemCode);

    useEffect(() => {
        if (!session.user || !giftCard) {
            void navigate({ to: '/{-$locale}/gift-card' });
        }
    }, [session.user, giftCard, navigate]);

    async function onStripeSuccess() {
        if (!giftCard) {
            setConfirmPayment(false);
            return;
        }
        setBusy(true);
        try {
            const result = await giftCardPay({
                input: {
                    giftCardId: giftCard.giftCardId,
                    invoiceAddress: {
                        ...invoiceAddress,
                        companyName: invoiceAddress.companyName || '',
                        line2: invoiceAddress.line2 || '',
                    },
                },
            });
            if (result.error || !result.data?.user.giftCardPay.success) {
                toast.error(
                    {
                        de: 'Zahlung konnte nicht abgeschlossen werden.',
                        en: 'Could not complete payment.',
                    }[locale],
                );
                setConfirmPayment(false);
                setBusy(false);
                return;
            }
            void trackFunnelInteraction({
                input: {
                    webPageKey: 'GIFT_CARD',
                    area: giftCardFunnelArea,
                    interaction: { type: 'step_completed', step: 'checkout' },
                },
            });
        } catch {
            toast.error(
                {
                    de: 'Zahlung konnte nicht abgeschlossen werden.',
                    en: 'Could not complete payment.',
                }[locale],
            );
            setConfirmPayment(false);
            setBusy(false);
        }
    }

    function onStripeFailure(errorMessage?: string) {
        setConfirmPayment(false);
        setBusy(false);
        toast.error(errorMessage ?? { de: 'Zahlung fehlgeschlagen.', en: 'Payment failed.' }[locale]);
    }

    if (!giftCard) {
        return null;
    }

    return (
        <main id="main-content" className="flex min-h-screen flex-col">
            <Header user={session.user} />

            <div className="mx-auto grid w-full max-w-xl flex-1 content-start gap-8 p-6 sm:p-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl tracking-tight">{{ de: 'Zahlung', en: 'Checkout' }[locale]}</h1>
                    <p className="text-muted-foreground">
                        {
                            {
                                de: `Gutschein über ${formatCurrency(giftCard.originalBalanceCents, { locale })} für ${giftCard.recipientName}`,
                                en: `Gift card for ${formatCurrency(giftCard.originalBalanceCents, { locale })} for ${giftCard.recipientName}`,
                            }[locale]
                        }
                    </p>
                </div>

                {paid && giftCard.redeemCode ? (
                    <div className="grid gap-4 rounded-xl border border-border bg-secondary p-6">
                        <p className="font-serif text-2xl tracking-tight">
                            {{ de: 'Gutschein gekauft', en: 'Gift card purchased' }[locale]}
                        </p>
                        <p className="text-muted-foreground">
                            {
                                {
                                    de: `Wir haben den Code und die PDFs an ${giftCard.buyerEmail} gesendet.`,
                                    en: `We sent the code and PDFs to ${giftCard.buyerEmail}.`,
                                }[locale]
                            }
                        </p>
                        <div className="grid gap-1">
                            <p className="text-sm text-muted-foreground">{{ de: 'Einlöscode', en: 'Redeem code' }[locale]}</p>
                            <p className="font-mono text-xl tracking-wider">{giftCard.redeemCode}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: `Gültig bis ${formatDate(giftCard.expiresAt, { locale, timeZone, dateStyle: 'long' })}`,
                                    en: `Valid until ${formatDate(giftCard.expiresAt, { locale, timeZone, dateStyle: 'long' })}`,
                                }[locale]
                            }
                        </p>
                        <div className="flex flex-row-reverse flex-wrap items-end gap-2">
                            <Button asChild>
                                <Link to="/{-$locale}/profile/gift-cards">
                                    {{ de: 'Zu meinen Gutscheinen', en: 'My gift cards' }[locale]}
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/{-$locale}/gift-card">{{ de: 'Weiteren kaufen', en: 'Buy another' }[locale]}</Link>
                            </Button>
                        </div>
                    </div>
                ) : preparedPayment ? (
                    <div className="grid gap-6">
                        <Suspense fallback={<div className="min-h-40 animate-pulse rounded-md bg-muted/40" aria-hidden />}>
                            <StripePaymentPanel
                                kind="PAYMENT_INTENT"
                                clientSecret={preparedPayment.clientSecret}
                                publishableKey={preparedPayment.publishableKey}
                                locale={locale}
                                invoiceAddress={invoiceAddress}
                                onInvoiceAddressChange={setInvoiceAddress}
                                confirm={confirmPayment}
                                onSuccess={() => void onStripeSuccess()}
                                onFailure={onStripeFailure}
                                defaultValues={{
                                    name: session.user ? userDisplayName(session.user) : undefined,
                                    email: session.user?.emailAddress ?? giftCard.buyerEmail,
                                }}
                            />
                        </Suspense>
                        <Button
                            type="button"
                            size="lg"
                            onClick={() => {
                                setBusy(true);
                                setConfirmPayment(true);
                            }}
                            disabled={busy || confirmPayment}
                        >
                            {
                                {
                                    de: busy || confirmPayment ? 'Wird bestätigt…' : 'Jetzt bezahlen',
                                    en: busy || confirmPayment ? 'Confirming…' : 'Pay now',
                                }[locale]
                            }
                        </Button>
                        <Button asChild variant="ghost">
                            <Link to="/{-$locale}/gift-card">{{ de: 'Zurück', en: 'Back' }[locale]}</Link>
                        </Button>
                    </div>
                ) : (
                    <p className="text-muted-foreground">{{ de: 'Zahlung wird geladen…', en: 'Loading payment…' }[locale]}</p>
                )}
            </div>

            <Footer />
        </main>
    );
}
