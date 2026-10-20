import { useForm, useSelector } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { chefSignUpFunnelArea } from '../../shared/chefSignUpFunnel';
import type { ChefSignUpFunnelClientStep } from '../../shared/chefSignUpFunnel';
import { AuthIdentityGate } from '../components/auth/AuthIdentityGate';
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

const chefSignUpPageTitle = { de: 'Als Koch registrieren', en: 'Chef sign-up' } as const;
const TRAVEL_DISTANCE_OPTIONS = ['50', '100', '150', '200'] as const;

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

export function ChefSignUpPage({ loaderData }: { loaderData: GqlCChefSignUpPageQuery }) {
    const locale = useLocale();
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
            maximumTravelDistanceText: '100',
        } satisfies ChefSignUpFormValues,
        onSubmit: async ({ value }) => {
            if (!value.selectedLocation?.displayText) {
                toast.error({ de: 'Bitte vervollständige das Koch-Profil.', en: 'Please complete the chef profile.' }[locale]);
                return;
            }
            const cents = euroTextToCents(value.travelExpensesText);
            if (cents === null || cents < 25) {
                toast.error(
                    {
                        de: 'Bitte gib gültige Reisekosten ein (mind. 0,25 €).',
                        en: 'Please enter valid travel expenses (at least €0.25).',
                    }[locale],
                );
                return;
            }
            const distance = Number(value.maximumTravelDistanceText);
            if (!Number.isInteger(distance) || distance < 5 || distance > 250) {
                toast.error(
                    {
                        de: 'Die maximale Reisestrecke muss zwischen 5 und 250 km liegen.',
                        en: 'Maximum travel distance must be between 5 and 250 km.',
                    }[locale],
                );
                return;
            }

            const result = await cookCreate({
                input: {
                    exactTravelOriginAddress: value.selectedLocation.displayText,
                    travelExpensesAmount: cents,
                    maximumTravelDistance: distance,
                },
            });
            if (result.error || !result.data?.user.cookCreate.success) {
                const wasAlreadyCook = result.error?.message.includes('already a cook');
                if (wasAlreadyCook) {
                    setSuccess(true);
                    return;
                }
                toast.error({ de: 'Koch-Konto konnte nicht erstellt werden.', en: 'Could not create the chef account.' }[locale]);
                return;
            }
            trackFunnelStep('step_completed', 'profile');
            setSuccess(true);
            toast.success({ de: 'Koch-Konto erstellt.', en: 'Chef account created.' }[locale]);
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const locationSearchText = useSelector(form.store, (state) => state.values.locationSearchText);
    const selectedLocation = useSelector(form.store, (state) => state.values.selectedLocation);
    const formReady = useSelector(form.store, (state) => chefSignUpFormReady(state.values));

    const debouncedLocationSearch = useDebouncedValue(locationSearchText, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: CookCreateLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || selectedLocation?.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    return (
        <main id="main-content" className="flex min-h-screen flex-col">
            <Header user={session.user} />

            <div className="mx-auto grid w-full max-w-lg flex-1 content-start gap-10 p-8">
                <div className="grid gap-3">
                    <h1 className="font-serif text-3xl tracking-tight">{chefSignUpPageTitle[locale]}</h1>
                    <p className="leading-relaxed text-muted-foreground">
                        {alreadyCook
                            ? {
                                  de: 'Willkommen bei peopleeat! Gehe zu deinem Profil, um die nächsten Schritte abzuschließen.',
                                  en: 'Welcome to peopleeat! Go to your profile to finalise next steps',
                              }[locale]
                            : {
                                  de: 'Log-on und Koch-Profil in einem Schritt, oder bestehendes Konto zum Koch erweitern.',
                                  en: 'Log on and create your chef profile in one step, or upgrade an existing account.',
                              }[locale]}
                    </p>
                </div>

                {alreadyCook ? (
                    <StatusAlert
                        tone="success"
                        title={{ de: 'Du bist als Koch registriert', en: 'You are registered as a chef' }[locale]}
                        action={
                            <Button type="button" asChild>
                                <Link to="/{-$locale}/profile">{{ de: 'Zum Profil', en: 'Go to profile' }[locale]}</Link>
                            </Button>
                        }
                    >
                        {
                            {
                                de: 'Als Nächstes Sichtbarkeit und Stripe-Onboarding unter Profil erledigen.',
                                en: 'Next: finish visibility and Stripe onboarding under Profile.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : (
                    <AuthIdentityGate
                        initialSession={session}
                        includeCook
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
                                    <p className="font-medium">{{ de: 'Koch-Profil anlegen', en: 'Create chef profile' }[locale]}</p>
                                    <p className="text-sm/relaxed text-muted-foreground">
                                        {
                                            {
                                                de: 'Dein Konto ist bereit. Vervollständige das Koch-Profil, um Mitglied zu werden.',
                                                en: 'Your account is ready. Complete the chef profile to become a member.',
                                            }[locale]
                                        }
                                    </p>
                                </div>

                                <div className="grid gap-3">
                                    <div className="grid gap-1.5">
                                        <span className="text-sm font-medium">
                                            {{ de: 'Startadresse für die Reisestrecke', en: 'Travel origin address' }[locale]}
                                        </span>
                                        <p className="text-sm/relaxed text-muted-foreground">
                                            {
                                                {
                                                    de: 'Wird nicht für Gastgeber angezeigt. Sie sehen nur die Stadt.',
                                                    en: 'Not shown to hosts. They only see the city.',
                                                }[locale]
                                            }
                                        </p>
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
                                            placeholder={{ de: 'Adresse suchen…', en: 'Search address…' }[locale]}
                                            showClear={false}
                                        />
                                        <ComboboxContent>
                                            <ComboboxEmpty>
                                                {suggestionsFetching
                                                    ? { de: 'Suche…', en: 'Searching…' }[locale]
                                                    : { de: 'Keine Treffer.', en: 'No matches.' }[locale]}
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
                                            {
                                                {
                                                    de: `Gastgeber sehen ${selectedLocation.structuredAddress.city}.`,
                                                    en: `Hosts will see ${selectedLocation.structuredAddress.city}.`,
                                                }[locale]
                                            }
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <form.Field name="maximumTravelDistanceText">
                                        {(field) => (
                                            <div className="grid gap-2">
                                                <span className="text-sm font-medium">
                                                    {{ de: 'Maximale Reisestrecke', en: 'Maximum travel distance' }[locale]}
                                                </span>
                                                <Select
                                                    value={field.state.value}
                                                    disabled={isSubmitting}
                                                    onValueChange={(next) => field.handleChange(next)}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TRAVEL_DISTANCE_OPTIONS.map((option) => (
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
                                                    {{ de: 'Reisekosten je km', en: 'Travel expenses per km' }[locale]}
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
                                    {{ de: 'Als Koch registrieren', en: 'Register as chef' }[locale]}
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
