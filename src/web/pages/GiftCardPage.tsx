import { useForm, useSelector } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatCurrency } from '../../shared';
import { giftCardFunnelArea } from '../../shared/giftCardFunnel';
import type { GiftCardFunnelClientStep } from '../../shared/giftCardFunnel';
import { AuthIdentityGate } from '../components/auth/AuthIdentityGate';
import { AuthIdentityGateLogOnFooter } from '../components/auth/AuthIdentityGateLogOnFooter';
import { sessionAuthPhase } from '../components/auth/sessionAuthPhase';
import { Button } from '../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/base/dialog';
import { Input } from '../components/base/input';
import { Textarea } from '../components/base/textarea';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCGiftCardPageQuery } from '../graphql/generated';
import { GiftCardCreateDocument, GiftCardFunnelTrackDocument, GiftCardSessionUpdatesDocument } from '../graphql/generated';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { SITE_WHATSAPP_URL } from '../seo/seoConstants';
import { cn } from '../utils/cn';
import type { GiftCardFormSearch, GiftCardFormStep, GiftCardFormValues } from './giftCardFormSearch';
import {
    AMOUNT_PRESETS_EUROS,
    giftCardFormBalanceCents,
    giftCardFormSearchEqual,
    giftCardFormSearchFromValues,
    giftCardFormValuesFromSearch,
    MIN_AMOUNT_EUROS,
} from './giftCardFormSearch';

export { parseGiftCardFormSearch } from './giftCardFormSearch';
export type { GiftCardFormSearch } from './giftCardFormSearch';

type GiftCardSession = GqlCGiftCardPageQuery['currentSession'];

const OCCASIONS = [
    { value: 'Geburtstag', labelKey: 'giftCard.occasionBirthday' as const },
    { value: 'Geburt', labelKey: 'giftCard.occasionBirth' as const },
    { value: 'Hochzeit', labelKey: 'giftCard.occasionWedding' as const },
    { value: 'Jahrestag', labelKey: 'giftCard.occasionAnniversary' as const },
    { value: 'Dankeschön', labelKey: 'giftCard.occasionThanks' as const },
    { value: 'Weihnachten', labelKey: 'giftCard.occasionChristmas' as const },
    { value: 'Einfach so', labelKey: 'giftCard.occasionJustBecause' as const },
] as const;

const MIN_BALANCE_CENTS = MIN_AMOUNT_EUROS * 100;

function initialStepFromSearch(search: GiftCardFormSearch, signedIn: boolean): GiftCardFormStep {
    if (search.step === 'auth' && !signedIn) return 'auth';
    return 'configure';
}

export function GiftCardPage({
    loaderData,
    search,
}: {
    loaderData: { data: GqlCGiftCardPageQuery; recaptchaSiteKey: string };
    search: GiftCardFormSearch;
}) {
    const inner = <GiftCardPageInner data={loaderData.data} recaptchaSiteKey={loaderData.recaptchaSiteKey} search={search} />;
    if (loaderData.recaptchaSiteKey) {
        return <GoogleReCaptchaProvider reCaptchaKey={loaderData.recaptchaSiteKey}>{inner}</GoogleReCaptchaProvider>;
    }
    return inner;
}

function GiftCardPageInner({
    data,
    recaptchaSiteKey,
    search,
}: {
    data: GqlCGiftCardPageQuery;
    recaptchaSiteKey: string;
    search: GiftCardFormSearch;
}) {
    const locale = useLocale();
    const { t } = useT('public');
    const { t: tCommon } = useT('common');
    const client = useClient();
    const navigate = useNavigate({ from: '/{-$locale}/gift-card' });
    const { executeRecaptcha } = useGoogleReCaptcha();

    const [session, setSession] = useState<GiftCardSession>(data.currentSession);
    const signedIn = sessionAuthPhase(session) === 'signedIn';
    const [step, setStep] = useState<GiftCardFormStep>(() => initialStepFromSearch(search, signedIn));
    const [recaptchaErrorOpen, setRecaptchaErrorOpen] = useState(false);

    const [, giftCardCreate] = useMutation(GiftCardCreateDocument);
    const [, trackFunnelInteraction] = useMutation(GiftCardFunnelTrackDocument);
    const enteredStepsRef = useRef(new Set<GiftCardFunnelClientStep>());
    const seededValues = giftCardFormValuesFromSearch(search);

    const trackFunnelStep = useEffectEvent((type: 'step_entered' | 'step_completed', funnelStep: GiftCardFunnelClientStep) => {
        void trackFunnelInteraction({
            input: {
                webPageKey: 'GIFT_CARD',
                area: giftCardFunnelArea,
                interaction: { type, step: funnelStep },
            },
        });
    });

    useEffect(() => {
        if (enteredStepsRef.current.has(step)) return;
        enteredStepsRef.current.add(step);
        trackFunnelStep('step_entered', step);
    }, [step]);

    const form = useForm({
        defaultValues: {
            amountPreset: seededValues.amountPreset,
            customEuros: seededValues.customEuros,
            occasion: seededValues.occasion,
            recipientName: seededValues.recipientName,
            message: seededValues.message,
        } satisfies GiftCardFormValues,
        onSubmit: async ({ value }) => {
            if (!signedIn) {
                trackFunnelStep('step_completed', 'configure');
                setStep('auth');
                return;
            }
            trackFunnelStep('step_completed', 'configure');
            await createAndGoToCheckout(value);
        },
    });

    const values = useSelector(form.store, (state) => state.values);
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

    const draftKey = JSON.stringify({
        amountPreset: values.amountPreset,
        customEuros: values.customEuros,
        occasion: values.occasion,
        recipientName: values.recipientName,
        message: values.message,
        step,
    });
    const debouncedDraftKey = useDebouncedValue(draftKey, 300);

    useEffect(() => {
        const request = createRequest(GiftCardSessionUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.sessionUpdates;
                if (next) setSession(next);
            }),
        );
        return unsubscribe;
    }, [client]);

    useEffect(() => {
        if (session.giftCardPurchaseError?.code === 'RECAPTCHA_FAILED') {
            setRecaptchaErrorOpen(true);
            setStep('configure');
        }
    }, [session.giftCardPurchaseError]);

    useEffect(() => {
        if (signedIn && step === 'auth') {
            trackFunnelStep('step_completed', 'auth');
            setStep('configure');
        }
    }, [signedIn, step]);

    useEffect(() => {
        const draft = JSON.parse(debouncedDraftKey) as GiftCardFormValues & { step: GiftCardFormStep };
        const nextSearch = giftCardFormSearchFromValues({
            values: {
                amountPreset: draft.amountPreset,
                customEuros: draft.customEuros,
                occasion: draft.occasion,
                recipientName: draft.recipientName,
                message: draft.message,
            },
            step: draft.step,
        });
        if (giftCardFormSearchEqual(nextSearch, search)) return;
        void navigate({ search: nextSearch, replace: true });
    }, [debouncedDraftKey, navigate, search]);

    const preparedGiftCard = session.giftCard?.paymentStatus === 'PREPARED' && session.giftCard.payment ? session.giftCard : null;

    const balanceCents = giftCardFormBalanceCents(values);
    const formValid = balanceCents >= MIN_BALANCE_CENTS && values.occasion.trim().length > 0 && values.recipientName.trim().length > 0;

    async function createAndGoToCheckout(formValues: GiftCardFormValues) {
        const cents = giftCardFormBalanceCents(formValues);
        if (cents < MIN_BALANCE_CENTS || formValues.recipientName.trim().length === 0) return;

        try {
            let recaptchaToken = '';
            if (recaptchaSiteKey && executeRecaptcha) {
                recaptchaToken = await executeRecaptcha('gift_card_purchase');
            }
            const result = await giftCardCreate({
                input: {
                    balanceCents: cents,
                    occasion: formValues.occasion,
                    recipientName: formValues.recipientName.trim(),
                    message: formValues.message.trim(),
                    locale,
                    recaptchaToken,
                },
            });
            const mutationResult = result.data?.user.giftCardCreate;
            if (result.error || !mutationResult?.success || !mutationResult.referenceId) {
                if (session.giftCardPurchaseError?.code !== 'RECAPTCHA_FAILED' && !recaptchaSiteKey) {
                    toast.error(t('giftCard.createFailed'));
                } else if (recaptchaSiteKey && !result.error) {
                    window.setTimeout(() => {
                        toast.error(t('giftCard.createFailed'));
                    }, 2000);
                }
                return;
            }
            await navigate({
                to: '/{-$locale}/gift-card/$giftCardId/checkout',
                params: { giftCardId: mutationResult.referenceId },
            });
        } catch {
            toast.error(t('giftCard.createFailed'));
        }
    }

    const previewAmount = formatCurrency(balanceCents, { locale });
    const previewOccasionKey = OCCASIONS.find((item) => item.value === values.occasion)?.labelKey;
    const previewOccasion = previewOccasionKey ? t(previewOccasionKey) : values.occasion;
    const busy = isSubmitting;

    return (
        <main id="main-content" className="flex min-h-screen flex-col">
            <Header user={session.user} />

            <div className="mx-auto grid w-full max-w-5xl flex-1 gap-10 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                <div className="grid content-start gap-8">
                    <div className="grid gap-2">
                        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{t('giftCard.title')}</h1>
                        <p className="text-muted-foreground">{t('giftCard.description')}</p>
                    </div>

                    {preparedGiftCard ? (
                        <div className="grid gap-4 rounded-xl border border-border bg-secondary p-6">
                            <p className="font-serif text-xl tracking-tight">{t('giftCard.paymentInProgress')}</p>
                            <p className="text-muted-foreground">
                                {t('giftCard.preparedAmount', {
                                    amount: formatCurrency(preparedGiftCard.originalBalanceCents, { locale }),
                                })}
                            </p>
                            <Button asChild size="lg">
                                <Link to="/{-$locale}/gift-card/$giftCardId/checkout" params={{ giftCardId: preparedGiftCard.giftCardId }}>
                                    {t('giftCard.continueCheckout')}
                                </Link>
                            </Button>
                        </div>
                    ) : null}

                    {step === 'auth' && !signedIn ? (
                        <div className="mx-auto grid w-full max-w-md gap-4">
                            <div className="grid gap-1">
                                <h2 className="font-serif text-2xl tracking-tight">{t('giftCard.signInTitle')}</h2>
                                <p className="text-sm text-muted-foreground">{t('giftCard.signInBody')}</p>
                            </div>
                            <AuthIdentityGate
                                initialSession={session}
                                requireProfileDetails={false}
                                onSessionChange={(authSession) => {
                                    setSession((prev) => ({
                                        ...prev,
                                        sessionId: authSession.sessionId,
                                        user: authSession.user
                                            ? {
                                                  ...prev.user,
                                                  ...authSession.user,
                                                  admin: prev.user?.admin ?? null,
                                                  cook: prev.user?.cook ?? null,
                                              }
                                            : null,
                                        authEmailOtp: authSession.authEmailOtp,
                                        authOauthTicket: authSession.authOauthTicket,
                                    }));
                                }}
                                onReady={() => {
                                    void createAndGoToCheckout(values);
                                }}
                                footer={(gateSession, sessionRefresh) => (
                                    <AuthIdentityGateLogOnFooter session={gateSession} sessionRefresh={sessionRefresh} />
                                )}
                            />
                            <Button type="button" variant="ghost" onClick={() => setStep('configure')} disabled={busy}>
                                {t('giftCard.back')}
                            </Button>
                        </div>
                    ) : (
                        <form
                            className="grid gap-8"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void form.handleSubmit();
                            }}
                        >
                            <form.Field name="amountPreset">
                                {(presetField) => (
                                    <form.Field name="customEuros">
                                        {(customField) => (
                                            <fieldset className="grid gap-3">
                                                <legend className="text-sm font-medium">{t('giftCard.amount')}</legend>
                                                <div className="flex flex-wrap gap-2">
                                                    {AMOUNT_PRESETS_EUROS.map((euros) => {
                                                        const active = presetField.state.value === euros;
                                                        return (
                                                            <Button
                                                                key={euros}
                                                                type="button"
                                                                size="sm"
                                                                variant={active ? 'default' : 'outline'}
                                                                onClick={() => {
                                                                    presetField.handleChange(euros);
                                                                    customField.handleChange(String(euros));
                                                                }}
                                                                disabled={busy}
                                                            >
                                                                {formatCurrency(euros * 100, { locale })}
                                                            </Button>
                                                        );
                                                    })}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={presetField.state.value === 'custom' ? 'default' : 'outline'}
                                                        onClick={() => presetField.handleChange('custom')}
                                                        disabled={busy}
                                                    >
                                                        {t('giftCard.custom')}
                                                    </Button>
                                                </div>
                                                {presetField.state.value === 'custom' ? (
                                                    <div className="grid max-w-xs gap-1.5">
                                                        <label htmlFor="gift-card-custom-amount" className="text-sm font-medium">
                                                            {t('giftCard.customAmount', { min: MIN_AMOUNT_EUROS })}
                                                        </label>
                                                        <Input
                                                            id="gift-card-custom-amount"
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={customField.state.value}
                                                            onBlur={customField.handleBlur}
                                                            onChange={(event) => customField.handleChange(event.target.value)}
                                                            disabled={busy}
                                                        />
                                                    </div>
                                                ) : null}
                                            </fieldset>
                                        )}
                                    </form.Field>
                                )}
                            </form.Field>

                            <form.Field name="occasion">
                                {(field) => (
                                    <fieldset className="grid gap-3">
                                        <legend className="text-sm font-medium">{t('giftCard.occasion')}</legend>
                                        <div className="flex flex-wrap gap-2">
                                            {OCCASIONS.map((item) => {
                                                const active = field.state.value === item.value;
                                                return (
                                                    <Button
                                                        key={item.value}
                                                        type="button"
                                                        size="sm"
                                                        variant={active ? 'default' : 'outline'}
                                                        onClick={() => field.handleChange(item.value)}
                                                        disabled={busy}
                                                    >
                                                        {t(item.labelKey)}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </fieldset>
                                )}
                            </form.Field>

                            <form.Field name="recipientName">
                                {(field) => (
                                    <div className="grid gap-1.5">
                                        <label htmlFor="gift-card-recipient-name" className="text-sm font-medium">
                                            {t('giftCard.recipientName')}
                                        </label>
                                        <Input
                                            id="gift-card-recipient-name"
                                            type="text"
                                            autoComplete="name"
                                            required
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            disabled={busy}
                                            placeholder={t('giftCard.recipientPlaceholder')}
                                        />
                                        <p className="text-xs text-muted-foreground">{t('giftCard.recipientHint')}</p>
                                    </div>
                                )}
                            </form.Field>

                            <form.Field name="message">
                                {(field) => (
                                    <div className="grid gap-1.5">
                                        <label htmlFor="gift-card-message" className="text-sm font-medium">
                                            {t('giftCard.message')}
                                        </label>
                                        <Textarea
                                            id="gift-card-message"
                                            rows={4}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            placeholder={t('giftCard.messagePlaceholder')}
                                            disabled={busy}
                                        />
                                    </div>
                                )}
                            </form.Field>

                            {signedIn ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('giftCard.codeGoesTo', { email: session.user?.emailAddress ?? '' })}
                                </p>
                            ) : null}

                            <Button type="submit" size="lg" disabled={busy || !formValid} className="justify-self-end">
                                {busy
                                    ? t('giftCard.preparing')
                                    : signedIn
                                      ? t('giftCard.continueWithAmount', { amount: previewAmount })
                                      : t('giftCard.signInAndBuy', { amount: previewAmount })}
                            </Button>
                        </form>
                    )}
                </div>

                <aside
                    className={cn('rounded-xl border border-border bg-secondary p-5 shadow-xs', 'lg:sticky lg:top-20')}
                    aria-label={t('giftCard.previewAria')}
                >
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('giftCard.preview')}</p>
                    <p className="mt-3 font-serif text-3xl tracking-tight">{previewAmount}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{previewOccasion}</p>
                    <div className="mt-6 grid gap-1 border-t border-border/60 pt-4 text-sm">
                        <p className="font-medium">{values.recipientName.trim() || t('giftCard.recipientFallback')}</p>
                        <p className="whitespace-pre-wrap text-muted-foreground">
                            {values.message.trim() || t('giftCard.messageFallback')}
                        </p>
                    </div>
                </aside>
            </div>

            <Footer />

            <Dialog open={recaptchaErrorOpen} onOpenChange={setRecaptchaErrorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('giftCard.recaptchaTitle')}</DialogTitle>
                        <DialogDescription>{t('giftCard.recaptchaBody')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button type="button" variant="ghost" onClick={() => setRecaptchaErrorOpen(false)}>
                            {tCommon('close')}
                        </Button>
                        <Button type="button" asChild>
                            <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                                {t('giftCard.openWhatsapp')}
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
