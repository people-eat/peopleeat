import { AddressElement, Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe, StripeAddressElementChangeEvent, StripeElementsOptions } from '@stripe/stripe-js';
// `/pure` + lazy import from callers: default `@stripe/stripe-js` injects js.stripe.com on import.
import { loadStripe } from '@stripe/stripe-js/pure';
import type { ReactNode } from 'react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { Locale } from '../../shared';
import type { GqlCInvoiceAddressInput } from '../graphql/generated';
import { Input } from './base/input';

type StripePaymentPanelKind = 'SETUP_INTENT' | 'PAYMENT_INTENT';

export type StripePaymentPanelProps = {
    kind: StripePaymentPanelKind;
    clientSecret: string;
    publishableKey: string;
    locale: Locale;
    invoiceAddress: GqlCInvoiceAddressInput;
    onInvoiceAddressChange: (next: GqlCInvoiceAddressInput) => void;
    /** Parent sets `true` to trigger confirmSetup / confirmPayment. Reset to `false` before retrying. */
    confirm: boolean;
    onSuccess: () => void;
    onFailure: (message?: string) => void;
    defaultValues?: {
        name?: string;
        email?: string;
    };
    /**
     * Bump to remount AddressElement after programmatic default changes
     * (e.g. “use event address as invoice address”).
     */
    addressElementKey?: number;
    /** Rendered between Payment Element and Address Element (e.g. reuse-event-address CTA). */
    beforeAddress?: ReactNode;
};

/** Stripe may return this when confirm runs again after a successful confirm (e.g. effect re-entry). */
function isAlreadySucceededConfirmError(error: {
    code?: string;
    payment_intent?: { status?: string } | null;
    setup_intent?: { status?: string } | null;
}): boolean {
    if (error.code !== 'payment_intent_unexpected_state' && error.code !== 'setup_intent_unexpected_state') {
        return false;
    }
    return error.payment_intent?.status === 'succeeded' || error.setup_intent?.status === 'succeeded';
}

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

function stripePromiseGet(publishableKey: string, locale: Locale): Promise<Stripe | null> {
    const cacheKey = `${publishableKey}:${locale}`;
    const cached = stripePromiseCache.get(cacheKey);
    if (cached) return cached;
    const promise = loadStripe(publishableKey, { locale });
    stripePromiseCache.set(cacheKey, promise);
    return promise;
}

function nameSplit(fullName: string): { firstName: string; lastName: string } {
    const trimmed = fullName.trim();
    const space = trimmed.indexOf(' ');
    if (space === -1) return { firstName: trimmed, lastName: '' };
    return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1).trim() };
}

/** Map Stripe decline/code to bilingual copy — never surface raw English `error.message`. */
function stripeConfirmErrorMessage(error: { code?: string; decline_code?: string } | undefined, locale: Locale): string {
    const code = error?.decline_code ?? error?.code;
    const byCode: Record<string, { de: string; en: string }> = {
        card_declined: {
            de: 'Karte abgelehnt. Bitte andere Zahlungsart versuchen.',
            en: 'Card declined. Please try another payment method.',
        },
        expired_card: { de: 'Karte abgelaufen.', en: 'Card expired.' },
        incorrect_cvc: { de: 'Ungültiger Sicherheitscode.', en: 'Invalid security code.' },
        insufficient_funds: { de: 'Nicht genügend Guthaben.', en: 'Insufficient funds.' },
        processing_error: {
            de: 'Zahlungsabwicklung fehlgeschlagen. Bitte erneut versuchen.',
            en: 'Payment processing failed. Please try again.',
        },
        authentication_required: {
            de: 'Zusätzliche Authentifizierung erforderlich.',
            en: 'Additional authentication required.',
        },
    };
    return (code && byCode[code] ? byCode[code] : { de: 'Zahlung fehlgeschlagen.', en: 'Payment failed.' })[locale];
}

function StripePaymentPanelForm({
    kind,
    locale,
    invoiceAddress,
    onInvoiceAddressChange,
    confirm,
    onSuccess,
    onFailure,
    defaultValues,
    addressElementKey = 0,
    beforeAddress,
}: Omit<StripePaymentPanelProps, 'clientSecret' | 'publishableKey'>) {
    const stripe = useStripe();
    const elements = useElements();
    const [addressComplete, setAddressComplete] = useState(false);
    /** Stays true after a successful confirm until parent resets `confirm` — prevents double Stripe confirm. */
    const confirmingRef = useRef(false);

    const reportSuccess = useEffectEvent(() => {
        onSuccess();
    });
    const reportFailure = useEffectEvent((message?: string) => {
        onFailure(message);
    });

    useEffect(() => {
        if (!confirm) {
            confirmingRef.current = false;
            return;
        }
        if (confirmingRef.current) return;
        if (!stripe || !elements) return;
        if (!addressComplete) {
            reportFailure({ de: 'Bitte vollständige Rechnungsadresse angeben.', en: 'Please enter a complete billing address.' }[locale]);
            return;
        }

        confirmingRef.current = true;
        void (async () => {
            try {
                const returnUrl = typeof window !== 'undefined' ? window.location.href : undefined;
                const result =
                    kind === 'SETUP_INTENT'
                        ? await stripe.confirmSetup({
                              elements,
                              redirect: 'if_required',
                              confirmParams: returnUrl ? { return_url: returnUrl } : undefined,
                          })
                        : await stripe.confirmPayment({
                              elements,
                              redirect: 'if_required',
                              confirmParams: returnUrl ? { return_url: returnUrl } : undefined,
                          });

                if (result.error) {
                    if (isAlreadySucceededConfirmError(result.error)) {
                        reportSuccess();
                        return;
                    }
                    confirmingRef.current = false;
                    reportFailure(stripeConfirmErrorMessage(result.error, locale));
                    return;
                }
                reportSuccess();
            } catch {
                confirmingRef.current = false;
                reportFailure();
            }
        })();
    }, [addressComplete, confirm, elements, kind, locale, stripe]);

    function onAddressChange(event: StripeAddressElementChangeEvent) {
        setAddressComplete(event.complete);
        const { firstName, lastName } = nameSplit(event.value.name);
        const address = event.value.address;
        onInvoiceAddressChange({
            companyName: invoiceAddress.companyName,
            firstName,
            lastName,
            country: address.country,
            city: address.city,
            postalCode: address.postal_code,
            line1: address.line1,
            line2: address.line2 ?? '',
        });
    }

    const fromAddress = [invoiceAddress.firstName, invoiceAddress.lastName].filter(Boolean).join(' ').trim();
    const defaultName = defaultValues?.name ?? (fromAddress || undefined);

    return (
        <div className="grid gap-4">
            <PaymentElement
                options={{
                    defaultValues: {
                        billingDetails: {
                            name: defaultName,
                            email: defaultValues?.email,
                        },
                    },
                }}
            />

            {beforeAddress}

            <AddressElement
                key={addressElementKey}
                options={{
                    mode: 'billing',
                    defaultValues: {
                        name: defaultName,
                        address: {
                            line1: invoiceAddress.line1 || undefined,
                            line2: invoiceAddress.line2 || undefined,
                            city: invoiceAddress.city || undefined,
                            postal_code: invoiceAddress.postalCode || undefined,
                            country: invoiceAddress.country || 'DE',
                        },
                    },
                }}
                onChange={onAddressChange}
            />

            <div className="grid gap-1.5">
                <label htmlFor="stripe-company-name" className="text-sm font-medium">
                    {{ de: 'Firma (optional)', en: 'Company (optional)' }[locale]}
                </label>
                <Input
                    id="stripe-company-name"
                    type="text"
                    autoComplete="organization"
                    value={invoiceAddress.companyName}
                    onChange={(event) =>
                        onInvoiceAddressChange({
                            ...invoiceAddress,
                            companyName: event.target.value,
                        })
                    }
                    placeholder={{ de: 'Firmenname', en: 'Company name' }[locale]}
                />
            </div>
        </div>
    );
}

export function StripePaymentPanel(props: StripePaymentPanelProps) {
    const { clientSecret, publishableKey, locale } = props;
    const [stripePromise] = useState(() => stripePromiseGet(publishableKey, locale));

    const options: StripeElementsOptions = {
        clientSecret,
        locale,
        appearance: {
            theme: 'stripe',
            variables: {
                borderRadius: '6px',
            },
        },
    };

    return (
        <Elements stripe={stripePromise} options={options}>
            <StripePaymentPanelForm {...props} />
        </Elements>
    );
}
