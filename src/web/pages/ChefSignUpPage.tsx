import { useForm, useSelector } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { chefSignUpFunnelArea } from '../../shared/chefSignUpFunnel';
import type { ChefSignUpFunnelClientStep } from '../../shared/chefSignUpFunnel';
import {
    COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM,
    cookTravelDistanceSelectOptions,
    cookTravelDistanceSelectValue,
} from '../../shared/cookTravelDistance';
import { expansionMarketFoundingChefTitle, expansionMarketFromParam, expansionMarketInCountryPhrase } from '../../shared/expansionMarkets';
import type { ExpansionMarketSlug } from '../../shared/expansionMarkets';
import { AuthIdentityGate } from '../components/auth/AuthIdentityGate';
import { AuthIdentityGateLogOnFooter } from '../components/auth/AuthIdentityGateLogOnFooter';
import { Button } from '../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../components/base/combobox';
import { Input } from '../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/base/select';
import { StatusAlert } from '../components/base/status-alert';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCChefSignUpPageQuery, GqlCLocationSuggestion } from '../graphql/generated';
import { ChefSignUpCookCreateDocument, ChefSignUpFunnelTrackDocument, CookCreateLocationSuggestionsDocument } from '../graphql/generated';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

type ChefSignUpFormValues = {
    locationSearchText: string;
    selectedLocation: GqlCLocationSuggestion | null;
    travelExpensesText: string;
    maximumTravelDistanceText: string;
};

function euroTextToCents(value: string): number | null {
    if (value.trim() === '') return null;
    if (/[a-zA-Z]/u.test(value)) return null;
    if (!/^-?\d*([.,]\d{0,2})?$/u.test(value)) return null;
    const floatValue = Number.parseFloat(value.replace(',', '.'));
    if (Number.isNaN(floatValue)) return null;
    return Math.round(floatValue * 100);
}

function chefSignUpFormReady(value: ChefSignUpFormValues): boolean {
    const cents = euroTextToCents(value.travelExpensesText);
    const distance = Number(value.maximumTravelDistanceText);
    return (
        Boolean(value.selectedLocation?.displayText) &&
        cents !== null &&
        cents >= 25 &&
        Number.isInteger(distance) &&
        distance >= 5 &&
        distance <= 250
    );
}

export function ChefSignUpPage({
    loaderData,
    marketSlug,
    inviteCookId,
}: {
    loaderData: GqlCChefSignUpPageQuery;
    marketSlug?: ExpansionMarketSlug;
    inviteCookId?: string;
}) {
    const locale = useLocale();
    const { t } = useT('public');
    const market = expansionMarketFromParam(marketSlug);
    const inCountry = market ? expansionMarketInCountryPhrase(market, locale) : '';
    const [success, setSuccess] = useState(Boolean(loaderData.currentSession.user?.cook));
    const [session, setSession] = useState(loaderData.currentSession);
    const [, cookCreate] = useMutation(ChefSignUpCookCreateDocument);
    const [, trackFunnelInteraction] = useMutation(ChefSignUpFunnelTrackDocument);
    const enteredStepsRef = useRef(new Set<ChefSignUpFunnelClientStep>());
    const completedAuthRef = useRef(false);

    const trackFunnelStep = useEffectEvent((type: 'step_entered' | 'step_completed', funnelStep: ChefSignUpFunnelClientStep) => {
        void trackFunnelInteraction({
            input: {
                webPageKey: 'CHEF_SIGN_UP',
                area: chefSignUpFunnelArea,
                interaction: { type, step: funnelStep },
            },
        });
    });

    const alreadyCook = success || Boolean(session.user?.cook);
    const signedIn = Boolean(session.user);

    useEffect(() => {
        if (alreadyCook) return;
        if (!signedIn) {
            if (enteredStepsRef.current.has('auth')) return;
            enteredStepsRef.current.add('auth');
            trackFunnelStep('step_entered', 'auth');
            return;
        }
        if (!completedAuthRef.current && enteredStepsRef.current.has('auth')) {
            completedAuthRef.current = true;
            trackFunnelStep('step_completed', 'auth');
        }
        if (enteredStepsRef.current.has('profile')) return;
        enteredStepsRef.current.add('profile');
        trackFunnelStep('step_entered', 'profile');
    }, [alreadyCook, signedIn]);

    const form = useForm({
        defaultValues: {
            locationSearchText: '',
            selectedLocation: null as GqlCLocationSuggestion | null,
            travelExpensesText: '0,25',
            maximumTravelDistanceText: cookTravelDistanceSelectValue(COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM),
        } satisfies ChefSignUpFormValues,
        onSubmit: async ({ value }) => {
            if (!value.selectedLocation?.displayText) {
                toast.error(t('chefSignUp.completeProfile'));
                return;
            }
            const cents = euroTextToCents(value.travelExpensesText);
            if (cents === null || cents < 25) {
                toast.error(t('chefSignUp.invalidTravelExpenses'));
                return;
            }
            const distance = Number(value.maximumTravelDistanceText);
            if (!Number.isInteger(distance) || distance < 5 || distance > 250) {
                toast.error(t('chefSignUp.invalidTravelDistance'));
                return;
            }

            const result = await cookCreate({
                input: {
                    exactTravelOriginAddress: value.selectedLocation.displayText,
                    travelExpensesAmount: cents,
                    maximumTravelDistance: distance,
                    ...(inviteCookId ? { inviteCookId } : {}),
                },
            });
            if (result.error || !result.data?.user.cookCreate.success) {
                const wasAlreadyCook = result.error?.message.includes('already a cook');
                if (wasAlreadyCook) {
                    setSuccess(true);
                    return;
                }
                toast.error(t('chefSignUp.createFailed'));
                return;
            }
            trackFunnelStep('step_completed', 'profile');
            setSuccess(true);
            toast.success(t('chefSignUp.created'));
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const locationSearchText = useSelector(form.store, (state) => state.values.locationSearchText);
    const selectedLocation = useSelector(form.store, (state) => state.values.selectedLocation);
    const formReady = useSelector(form.store, (state) => chefSignUpFormReady(state.values));

    const debouncedLocationSearch = useDebouncedValue(locationSearchText, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: CookCreateLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true, regionCode: market?.countryCode },
        pause: debouncedLocationSearch.trim().length < 3 || selectedLocation?.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    return (
        <main id="main-content" className="flex min-h-screen flex-col">
            <Header user={session.user} />

            <div className="mx-auto grid w-full max-w-lg flex-1 content-start gap-10 p-8">
                <div className="grid gap-3">
                    <h1 className="font-serif text-3xl tracking-tight">{t('chefSignUp.title')}</h1>
                    {inviteCookId && !alreadyCook ? (
                        <StatusAlert tone="info" title={t('chefSignUp.inviteTitle')}>
                            {t('chefSignUp.inviteBody')}
                        </StatusAlert>
                    ) : null}
                    {market ? (
                        <StatusAlert tone="info" title={expansionMarketFoundingChefTitle(market, locale)}>
                            {t('chefSignUp.marketBody', { inCountry })}
                        </StatusAlert>
                    ) : null}
                    <p className="leading-relaxed text-muted-foreground">
                        {alreadyCook ? t('chefSignUp.alreadyCookIntro') : t('chefSignUp.intro')}
                    </p>
                </div>

                {alreadyCook ? (
                    <StatusAlert
                        tone="success"
                        title={t('chefSignUp.registeredTitle')}
                        action={
                            <Button type="button" asChild>
                                <Link to="/{-$locale}/profile">{t('chefSignUp.goToProfile')}</Link>
                            </Button>
                        }
                    >
                        {t('chefSignUp.registeredBody')}
                    </StatusAlert>
                ) : (
                    <AuthIdentityGate
                        initialSession={session}
                        includeCook
                        inviteCookId={inviteCookId ?? null}
                        footer={(gateSession, sessionRefresh) => (
                            <AuthIdentityGateLogOnFooter session={gateSession} sessionRefresh={sessionRefresh} />
                        )}
                        onSessionChange={(next) => {
                            setSession(next);
                            if (next.user?.cook) {
                                setSuccess(true);
                            }
                        }}
                    >
                        {() => (
                            <form
                                className="grid gap-6"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void form.handleSubmit();
                                }}
                            >
                                <div className="grid gap-1.5">
                                    <p className="font-medium">{t('chefSignUp.createProfile')}</p>
                                    <p className="text-sm/relaxed text-muted-foreground">{t('chefSignUp.createProfileBody')}</p>
                                </div>

                                <div className="grid gap-3">
                                    <div className="grid gap-1.5">
                                        <span className="text-sm font-medium">{t('chefSignUp.originAddress')}</span>
                                        <p className="text-sm/relaxed text-muted-foreground">{t('chefSignUp.originHint')}</p>
                                    </div>
                                    <Combobox
                                        filter={null}
                                        items={suggestions.map((suggestion) => suggestion.displayText)}
                                        value={selectedLocation?.displayText ?? null}
                                        inputValue={locationSearchText}
                                        onValueChange={(next) => {
                                            if (next == null) return;
                                            const match = suggestions.find((suggestion) => suggestion.displayText === next);
                                            if (match) {
                                                form.setFieldValue('selectedLocation', match);
                                                form.setFieldValue('locationSearchText', match.displayText);
                                            }
                                        }}
                                        onInputValueChange={(next) => {
                                            form.setFieldValue('locationSearchText', next);
                                            if (selectedLocation && next !== selectedLocation.displayText) {
                                                form.setFieldValue('selectedLocation', null);
                                            }
                                        }}
                                        itemToStringLabel={(item: string) => item}
                                    >
                                        <ComboboxInput
                                            className="w-full"
                                            disabled={isSubmitting}
                                            placeholder={t('chefSignUp.searchAddress')}
                                            showClear={false}
                                        />
                                        <ComboboxContent>
                                            <ComboboxEmpty>
                                                {suggestionsFetching ? t('chefSignUp.searching') : t('chefSignUp.noMatches')}
                                            </ComboboxEmpty>
                                            <ComboboxList>
                                                {(item: string) => (
                                                    <ComboboxItem key={item} value={item}>
                                                        {item}
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                    {selectedLocation?.structuredAddress ? (
                                        <p className="text-sm text-muted-foreground">
                                            {t('chefSignUp.hostsSeeCity', { city: selectedLocation.structuredAddress.city })}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid items-end gap-5 sm:grid-cols-2">
                                    <form.Field name="maximumTravelDistanceText">
                                        {(field) => (
                                            <div className="grid gap-2">
                                                <span className="text-sm font-medium">{t('chefSignUp.maxDistance')}</span>
                                                <Select
                                                    value={field.state.value}
                                                    disabled={isSubmitting}
                                                    onValueChange={(next) => field.handleChange(next)}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue>{`${field.state.value} km`}</SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {cookTravelDistanceSelectOptions().map((option) => (
                                                            <SelectItem key={option} value={option}>
                                                                {option} km
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </form.Field>
                                    <form.Field name="travelExpensesText">
                                        {(field) => (
                                            <div className="grid gap-2">
                                                <label htmlFor="chef-sign-up-travel-expenses" className="text-sm font-medium">
                                                    {t('chefSignUp.travelPerKm')}
                                                </label>
                                                <div className="relative">
                                                    <Input
                                                        id="chef-sign-up-travel-expenses"
                                                        name={field.name}
                                                        disabled={isSubmitting}
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(event) => field.handleChange(event.target.value)}
                                                        className="pr-8"
                                                    />
                                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                                                        €
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </form.Field>
                                </div>

                                <Button type="submit" className="mt-1" disabled={isSubmitting || !formReady}>
                                    {t('chefSignUp.submit')}
                                </Button>
                            </form>
                        )}
                    </AuthIdentityGate>
                )}
            </div>

            <Footer />
        </main>
    );
}
