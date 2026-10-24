import { useForm, useSelector } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
    CakeIcon,
    CarrotIcon,
    ClockIcon,
    DropletIcon,
    GemIcon,
    HandPlatterIcon,
    HeartHandshakeIcon,
    HeartIcon,
    MapPinIcon,
    MinusIcon,
    PlusIcon,
    UsersIcon,
    UsersRoundIcon,
    XIcon,
} from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useClient, useMutation, useQuery } from 'urql';

import {
    bookingRequestFormFunnelArea,
    bookingRequestParticipantsFromCounts,
    bookingRequestPriceClassInfo,
    bookingRequestPriceClassTypes,
    dateDistanceInDaysToToday,
    defaultBookingRequestOccasions,
    defaultBookingRequestPreferences,
    featureToggleIsActive,
    formatCurrency,
    formatDate,
    formatParticipants,
    textNormalizeTitled,
} from '../../shared';
import type { BookingRequestFormFunnelStep, BookingRequestFormPriceClassType, BookingRequestParticipantDraft, Locale } from '../../shared';
import { AppImage } from '../components/AppImage';
import { AUTH_USER_PROFILE_FORM_ID, AuthIdentityGate } from '../components/auth/AuthIdentityGate';
import { AuthPasskeyLogOn } from '../components/auth/AuthPasskeyLogOn';
import { sessionAuthPhase } from '../components/auth/sessionAuthPhase';
import { Badge } from '../components/base/badge';
import { Button } from '../components/base/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/base/card';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../components/base/combobox';
import { DatePicker } from '../components/base/date-picker';
import { Input } from '../components/base/input';
import { StatusAlert } from '../components/base/status-alert';
import { Textarea } from '../components/base/textarea';
import { TimePicker } from '../components/base/time-picker';
import { BookingRequestFormBackNext, BookingRequestFormStepLayout } from '../components/BookingRequestFormStepLayout';
import { BookingRequestParticipantsRestrictionsEditor } from '../components/BookingRequestParticipantsRestrictionsEditor';
import { SelectableChip } from '../components/SelectableChip';
import {
    BookingRequestFormCreateDocument,
    BookingRequestFormFunnelTrackDocument,
    BookingRequestFormLocationSuggestionsDocument,
    BookingRequestFormSessionDiscountDocument,
} from '../graphql/generated';
import type {
    GqlCAuthSessionFieldsFragment,
    GqlCBookingRequestFormPageQuery,
    GqlCLocationSuggestion,
    GqlCUserBookingRequestCreate,
    GqlCUserBookingRequestExactEventAddressInput,
} from '../graphql/generated';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_LOGO_SRC_SET, SITE_NAME } from '../seo/seoConstants';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { BookingRequestFormSearch } from './bookingRequestFormSearch';
import {
    bookingRequestFormContentSteps,
    bookingRequestFormSearchEqual,
    bookingRequestFormSearchFromValues,
    bookingRequestFormValuesFromSearch,
} from './bookingRequestFormSearch';

export { parseBookingRequestFormSearch } from './bookingRequestFormSearch';
export type { BookingRequestFormSearch } from './bookingRequestFormSearch';

type ContentStep = ReturnType<typeof bookingRequestFormContentSteps>[number];
type FormStep = ContentStep | 'auth';

type BookingFormValues = {
    occasion: string;
    adultCount: number;
    discountedCount: number;
    locationSearchText: string;
    exactEventAddress: GqlCUserBookingRequestExactEventAddressInput | null;
    dateTime: Date;
    priceClassType: BookingRequestFormPriceClassType | null;
    preferences: string[];
    originalMessage: string;
    redeemCode: string;
};

const occasionIcons = [
    <CakeIcon className="size-4" key="cake-1" />,
    <CakeIcon className="size-4" key="cake-2" />,
    <HeartIcon className="size-4" key="heart" />,
    <GemIcon className="size-4" key="gem" />,
    <UsersRoundIcon className="size-4" key="users-round" />,
    <HeartHandshakeIcon className="size-4" key="handshake" />,
    <UsersIcon className="size-4" key="users" />,
];

type PreviousEventAddress = NonNullable<
    NonNullable<GqlCBookingRequestFormPageQuery['currentSession']['user']>['previousEventAddresses']
>[number];

function addressFromSuggestion(suggestion: GqlCLocationSuggestion): GqlCUserBookingRequestExactEventAddressInput | null {
    const structured = suggestion.structuredAddress;
    if (!structured) return null;
    return {
        displayText: structured.displayText,
        latitude: structured.latitude,
        longitude: structured.longitude,
        addressLine1: structured.addressLine1,
        addressLine2: structured.addressLine2,
        city: structured.city,
        postCode: structured.postCode,
        state: structured.state,
        country: structured.country,
    };
}

function addressFromPrevious(address: PreviousEventAddress): GqlCUserBookingRequestExactEventAddressInput {
    return {
        displayText: address.displayText,
        latitude: address.latitude,
        longitude: address.longitude,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        postCode: address.postCode,
        state: address.state,
        country: address.country,
    };
}

function exactEventAddressEqual(a: GqlCUserBookingRequestExactEventAddressInput, b: PreviousEventAddress): boolean {
    return (
        a.displayText === b.displayText &&
        a.latitude === b.latitude &&
        a.longitude === b.longitude &&
        a.addressLine1 === b.addressLine1 &&
        a.addressLine2 === b.addressLine2 &&
        a.city === b.city &&
        a.postCode === b.postCode &&
        a.state === b.state &&
        a.country === b.country
    );
}

function stepCopy(step: ContentStep | 'auth', locale: Locale): { sideBarTitle: string; title: string; subTitle?: string } {
    const copy = {
        occasion: {
            sideBarTitle: { de: 'Anlass', en: 'Occasion' }[locale],
            title: {
                de: 'Für welchen Anlass suchst du nach einem Privatkoch?',
                en: 'For which occasion are you looking for a private chef?',
            }[locale],
        },
        participants: {
            sideBarTitle: { de: 'Personen', en: 'Persons' }[locale],
            title: { de: 'Personenanzahl', en: 'Number of Guests' }[locale],
        },
        location: {
            sideBarTitle: { de: 'Wo', en: 'Where' }[locale],
            title: { de: 'Wo findet der Anlass statt?', en: 'Where will the event take place?' }[locale],
        },
        dateTime: {
            sideBarTitle: { de: 'Wann', en: 'When' }[locale],
            title: { de: 'An welchem Datum findet der Anlass statt?', en: 'On which date will the event take place?' }[locale],
            subTitle: {
                de: 'Wenn du das konkrete Datum noch nicht weißt, wähle einfach eines im richtigen Monat aus. Es kann später angepasst werden.',
                en: "If you don't know the exact date yet, simply choose one in the correct month. It can be adjusted later.",
            }[locale],
        },
        priceClass: {
            sideBarTitle: { de: 'Preisklasse', en: 'Price Class' }[locale],
            title: { de: 'Wie möchtest du den Anlass verbringen?', en: 'How would you like to spend the event?' }[locale],
        },
        preferences: {
            sideBarTitle: { de: 'Präferenzen', en: 'Preferences' }[locale],
            title: { de: 'Wie möchtest du das Menü gerne haben?', en: 'How would you like your menu to be?' }[locale],
            subTitle: {
                de: 'Teile deine Wünsche und Vorlieben mit den Köchen.',
                en: 'Share your wishes and preferences with the chefs.',
            }[locale],
        },
        restrictions: {
            sideBarTitle: { de: 'Einschränkungen', en: 'Restrictions' }[locale],
            title: {
                de: 'Gibt es Einschränkungen, Allergien oder Ähnliches?',
                en: 'Are there any restrictions such as allergies?',
            }[locale],
            subTitle: {
                de: 'Wähle die zutreffenden Einschränkungen.',
                en: 'Select the applicable restrictions.',
            }[locale],
        },
        message: {
            sideBarTitle: { de: 'Nachricht', en: 'Message' }[locale],
            title: {
                de: 'Möchtest du uns noch ein paar Einzelheiten mitteilen?',
                en: 'Would you like to share a few more details?',
            }[locale],
            subTitle: {
                de: 'Teile uns gerne mehr über deinen Anlass mit.',
                en: 'Please tell us more about your event.',
            }[locale],
        },
        auth: {
            sideBarTitle: '',
            title: { de: 'Anmelden oder Konto erstellen', en: 'Log on or create an account' }[locale],
            subTitle: {
                de: 'Mit E-Mail-Code bestätigen, dann Profil vervollständigen. Danach senden wir deine Anfrage.',
                en: 'Confirm with an email code, finish your profile, then we submit your request.',
            }[locale],
        },
    } as const;
    return copy[step];
}

type ConfirmedDiscount = {
    redeemCode: string;
    amountCents: number;
};

function createInputFromValues(
    values: BookingFormValues,
    participants: readonly BookingRequestParticipantDraft[],
    confirmedDiscount: ConfirmedDiscount | null,
): GqlCUserBookingRequestCreate | null {
    if (!values.exactEventAddress || !values.priceClassType) return null;
    if (values.adultCount < 1) return null;
    if (!values.occasion.trim() || !values.originalMessage.trim()) return null;
    return {
        occasion: values.occasion.trim(),
        dateTime: values.dateTime.toISOString(),
        exactEventAddress: values.exactEventAddress,
        originalMessage: values.originalMessage.trim(),
        preferences: values.preferences,
        participants: participants.map((participant) => ({
            type: participant.type,
            name: participant.name,
            restrictions: participant.restrictions,
        })),
        priceClassType: values.priceClassType,
        redeemCode: confirmedDiscount?.redeemCode ?? null,
    };
}

function initialStepFromSearch(search: BookingRequestFormSearch, signedIn: boolean, contentSteps: readonly ContentStep[]): FormStep {
    if (search.step === 'auth' && !signedIn) return 'auth';
    if (search.step && search.step !== 'auth' && (contentSteps as readonly string[]).includes(search.step)) {
        return search.step;
    }
    if (search.step === 'restrictions' && !(contentSteps as readonly string[]).includes('restrictions')) {
        return 'preferences';
    }
    return 'occasion';
}

export function BookingRequestFormPage({
    loaderData,
    search,
}: {
    loaderData: GqlCBookingRequestFormPageQuery;
    search: BookingRequestFormSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/booking-request/form' });
    const [session, setSession] = useState<GqlCAuthSessionFieldsFragment>(loaderData.currentSession);
    const signedIn = sessionAuthPhase(session) === 'signedIn';
    const restrictionsEnabled = featureToggleIsActive(session.activeFeatureToggleKeys, 'BOOKING_REQUEST_RESTRICTIONS');
    const contentSteps = bookingRequestFormContentSteps(restrictionsEnabled);
    const [step, setStep] = useState<FormStep>(() => initialStepFromSearch(search, signedIn, contentSteps));
    const [busy, setBusy] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [customPreferenceText, setCustomPreferenceText] = useState('');
    const [confirmedDiscount, setConfirmedDiscount] = useState<ConfirmedDiscount | null>(null);
    const [redeemInvalid, setRedeemInvalid] = useState(false);
    const [redeemBusy, setRedeemBusy] = useState(false);
    const createStarted = useRef(false);
    const redeemAutoTried = useRef(false);
    const enteredStepsRef = useRef(new Set<FormStep>());
    const client = useClient();
    const [, createBooking] = useMutation(BookingRequestFormCreateDocument);
    const [, trackFunnelInteraction] = useMutation(BookingRequestFormFunnelTrackDocument);
    const seededValues = bookingRequestFormValuesFromSearch(search);
    const [participants, setParticipants] = useState<BookingRequestParticipantDraft[]>(() =>
        bookingRequestParticipantsFromCounts({
            adultCount: seededValues.adultCount,
            discountedCount: seededValues.discountedCount,
            locale,
        }),
    );

    const form = useForm({
        defaultValues: {
            occasion: seededValues.occasion,
            adultCount: seededValues.adultCount,
            discountedCount: seededValues.discountedCount,
            locationSearchText: seededValues.locationSearchText,
            exactEventAddress: seededValues.exactEventAddress,
            dateTime: seededValues.dateTime,
            priceClassType: seededValues.priceClassType,
            preferences: seededValues.preferences,
            originalMessage: seededValues.originalMessage,
            redeemCode: seededValues.redeemCode,
        } satisfies BookingFormValues,
    });

    const values = useSelector(form.store, (state) => state.values);

    useEffect(() => {
        setParticipants((previous) =>
            bookingRequestParticipantsFromCounts({
                adultCount: values.adultCount,
                discountedCount: values.discountedCount,
                locale,
                previous,
            }),
        );
    }, [values.adultCount, values.discountedCount, locale]);

    useEffect(() => {
        if (step === 'restrictions' && !restrictionsEnabled) {
            setStep('preferences');
        }
    }, [restrictionsEnabled, step]);

    const trackFunnelStep = useEffectEvent((type: 'step_entered' | 'step_completed', funnelStep: BookingRequestFormFunnelStep) => {
        void trackFunnelInteraction({
            input: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: bookingRequestFormFunnelArea,
                interaction: { type, step: funnelStep },
            },
        });
    });

    useEffect(() => {
        if (enteredStepsRef.current.has(step)) return;
        enteredStepsRef.current.add(step);
        trackFunnelStep('step_entered', step);
    }, [step]);

    const debouncedLocationSearch = useDebouncedValue(values.locationSearchText, 300);
    // Serialize so `useDebouncedValue` is not reset every render by a fresh object.
    const draftKey = JSON.stringify({
        occasion: values.occasion,
        adultCount: values.adultCount,
        discountedCount: values.discountedCount,
        locationSearchText: values.locationSearchText,
        exactEventAddress: values.exactEventAddress,
        dateTime: values.dateTime.toISOString(),
        priceClassType: values.priceClassType,
        preferences: values.preferences,
        originalMessage: values.originalMessage,
        redeemCode: values.redeemCode,
        step,
    });
    const debouncedDraftKey = useDebouncedValue(draftKey, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: BookingRequestFormLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || values.exactEventAddress?.displayText === values.locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    useEffect(() => {
        const draft = JSON.parse(debouncedDraftKey) as {
            occasion: string;
            adultCount: number;
            discountedCount: number;
            locationSearchText: string;
            exactEventAddress: GqlCUserBookingRequestExactEventAddressInput | null;
            dateTime: string;
            priceClassType: BookingRequestFormPriceClassType | null;
            preferences: string[];
            originalMessage: string;
            redeemCode: string;
            step: FormStep;
        };
        const nextSearch = bookingRequestFormSearchFromValues({
            values: {
                occasion: draft.occasion,
                adultCount: draft.adultCount,
                discountedCount: draft.discountedCount,
                locationSearchText: draft.locationSearchText,
                exactEventAddress: draft.exactEventAddress,
                dateTime: new Date(draft.dateTime),
                priceClassType: draft.priceClassType,
                preferences: draft.preferences,
                originalMessage: draft.originalMessage,
                redeemCode: draft.redeemCode,
            },
            step: draft.step,
        });
        if (bookingRequestFormSearchEqual(nextSearch, search)) return;
        void navigate({ search: nextSearch, replace: true });
    }, [debouncedDraftKey, navigate, search]);

    const stepList: FormStep[] = signedIn ? [...contentSteps] : [...contentSteps, 'auth'];
    const contentStepIndex = contentSteps.indexOf(step as ContentStep);
    const stepNumber = step === 'auth' ? contentSteps.length + 1 : contentStepIndex + 1;
    const stepCount = stepList.length;

    async function submitBooking(input: GqlCUserBookingRequestCreate) {
        if (createStarted.current) return;
        createStarted.current = true;
        setBusy(true);
        try {
            const result = await createBooking({ input });
            const created = result.data?.user.bookingRequestCreate;
            if (result.error || !created?.success || !created.referenceId) {
                createStarted.current = false;
                toast.error({ de: 'Anfrage konnte nicht erstellt werden.', en: 'Could not create the booking request.' }[locale]);
                return;
            }
            toast.success({ de: 'Buchungsanfrage erstellt.', en: 'Booking request created.' }[locale]);
            await navigate({
                to: '/{-$locale}/booking-request/$bookingRequestId/submitted',
                params: { bookingRequestId: created.referenceId },
            });
        } finally {
            setBusy(false);
        }
    }

    function trySubmit() {
        if (values.redeemCode.trim().length > 0 && confirmedDiscount?.redeemCode !== values.redeemCode.trim()) {
            toast.error(
                {
                    de: 'Bitte löse den Rabattcode zuerst ein.',
                    en: 'Please redeem the discount code first.',
                }[locale],
            );
            return;
        }
        const input = createInputFromValues(values, participants, confirmedDiscount);
        if (!input) {
            toast.error(
                {
                    de: 'Bitte alle Pflichtfelder ausfüllen.',
                    en: 'Please complete all required fields.',
                }[locale],
            );
            return;
        }
        if (step === 'auth') {
            trackFunnelStep('step_completed', 'auth');
        }
        void submitBooking(input);
    }

    async function redeemDiscount(code: string) {
        const trimmed = code.trim();
        if (trimmed.length === 0 || redeemBusy) return;
        setRedeemBusy(true);
        setRedeemInvalid(false);
        try {
            const result = await client
                .query(BookingRequestFormSessionDiscountDocument, { redeemCode: trimmed }, { requestPolicy: 'network-only' })
                .toPromise();
            const discount = result.data?.currentSession.discount ?? null;
            if (!discount) {
                setConfirmedDiscount(null);
                setRedeemInvalid(true);
                form.setFieldValue('redeemCode', '');
                return;
            }
            setConfirmedDiscount({ redeemCode: discount.redeemCode, amountCents: discount.amountCents });
            form.setFieldValue('redeemCode', discount.redeemCode);
            setRedeemInvalid(false);
        } catch {
            setConfirmedDiscount(null);
            setRedeemInvalid(true);
        } finally {
            setRedeemBusy(false);
        }
    }

    const redeemDiscountOnSeed = useEffectEvent((code: string) => {
        void redeemDiscount(code);
    });

    useEffect(() => {
        if (redeemAutoTried.current) return;
        redeemAutoTried.current = true;
        const seededCode = seededValues.redeemCode.trim();
        if (seededCode.length === 0) return;
        redeemDiscountOnSeed(seededCode);
    }, [redeemDiscountOnSeed, seededValues.redeemCode]);

    function goNext() {
        if (step === 'message') {
            trackFunnelStep('step_completed', 'message');
            if (signedIn) {
                trySubmit();
                return;
            }
            setStep('auth');
            return;
        }
        if (step === 'auth') return;
        trackFunnelStep('step_completed', step);
        const index = contentSteps.indexOf(step);
        const next = contentSteps[index + 1];
        if (next) setStep(next);
    }

    function goBack() {
        if (step === 'auth') {
            setStep('message');
            return;
        }
        if (step === 'occasion') return;
        const index = contentSteps.indexOf(step);
        const previous = contentSteps[index - 1];
        if (previous) setStep(previous);
    }

    const completedSteps =
        step === 'auth'
            ? contentSteps.map((contentStep) => completedStepSummary(contentStep, values, participants, locale, timeZone))
            : contentSteps
                  .slice(0, Math.max(0, contentStepIndex))
                  .map((contentStep) => completedStepSummary(contentStep, values, participants, locale, timeZone));
    const copy = stepCopy(step === 'auth' ? 'auth' : step, locale);
    const defaultPreferences = defaultBookingRequestPreferences(locale);
    const preferenceOptionsCustom = values.preferences.filter((preference) => !defaultPreferences.includes(preference));
    const preferenceOptions = [...defaultPreferences, ...preferenceOptionsCustom].filter((option) =>
        option.toLowerCase().includes(customPreferenceText.toLowerCase()),
    );

    const includedInPrice: { title: string; icon: ReactNode }[] = [
        { title: { de: 'Zutaten', en: 'Ingredients' }[locale], icon: <CarrotIcon className="size-8" strokeWidth={1.5} /> },
        { title: { de: 'Arbeitszeit', en: 'Work Time' }[locale], icon: <ClockIcon className="size-8" strokeWidth={1.5} /> },
        { title: { de: 'Servieren', en: 'Serving' }[locale], icon: <HandPlatterIcon className="size-8" strokeWidth={1.5} /> },
        { title: { de: 'Saubere Küche', en: 'Clean Kitchen' }[locale], icon: <DropletIcon className="size-8" strokeWidth={1.5} /> },
    ];

    const nextDisabled =
        busy ||
        (step === 'occasion' && !values.occasion.trim()) ||
        (step === 'location' && !values.exactEventAddress) ||
        (step === 'dateTime' && !values.dateTime) ||
        (step === 'priceClass' && !values.priceClassType) ||
        (step === 'message' && !values.originalMessage.trim()) ||
        step === 'auth';

    return (
        <main id="main-content" className="flex h-dvh flex-col">
            <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between p-4">
                <Link
                    to="/{-$locale}"
                    className="inline-flex shrink-0 rounded-lg bg-background/30 px-2 backdrop-blur-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                    <AppImage
                        priority
                        src={SITE_LOGO}
                        srcSet={SITE_LOGO_SRC_SET}
                        alt={SITE_NAME}
                        width={SITE_LOGO_DISPLAY.width}
                        height={SITE_LOGO_DISPLAY.height}
                        className="h-7 w-auto"
                    />
                </Link>
                <Button type="button" variant="ghost" size="icon" asChild aria-label={{ de: 'Schließen', en: 'Close' }[locale]}>
                    <Link to="/{-$locale}">
                        <XIcon />
                    </Link>
                </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col pt-14">
                <div data-scroll-restoration-id="booking-form" className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-stable">
                    <div className="mx-auto w-full max-w-7xl lg:mt-20">
                        <BookingRequestFormStepLayout
                            stepNumber={stepNumber}
                            stepCount={stepCount}
                            title={copy.title}
                            subTitle={copy.subTitle}
                            completedSteps={completedSteps}
                            onCompletedStepClick={(index) => {
                                const target = contentSteps[index];
                                if (target) setStep(target);
                            }}
                        >
                            {step === 'occasion' ? (
                                <form.Field name="occasion">
                                    {(field) => (
                                        <div className="grid gap-4">
                                            <div className="grid gap-2">
                                                <span id="booking-request-occasion-label" className="text-sm font-medium">
                                                    {
                                                        {
                                                            de: 'Bitte gib deinen Anlass an oder wähle aus den vorgeschlagenen Optionen.',
                                                            en: 'Please state your occasion or choose from the suggested options.',
                                                        }[locale]
                                                    }
                                                </span>
                                                <Input
                                                    value={field.state.value}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                    placeholder={
                                                        {
                                                            de: 'z. B. Geburtstag, Firmenfeier',
                                                            en: 'e.g. Birthday, company dinner',
                                                        }[locale]
                                                    }
                                                    aria-labelledby="booking-request-occasion-label"
                                                    disabled={busy}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {defaultBookingRequestOccasions(locale).map((occasion, index) => (
                                                    <SelectableChip
                                                        key={occasion}
                                                        label={occasion}
                                                        icon={occasionIcons[index]}
                                                        selected={field.state.value === occasion}
                                                        disabled={busy}
                                                        onClick={() => field.handleChange(field.state.value === occasion ? '' : occasion)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </form.Field>
                            ) : null}

                            {step === 'participants' ? (
                                <div className="grid gap-6">
                                    <form.Field name="adultCount">
                                        {(field) => (
                                            <ParticipantCountField
                                                label={{ de: 'Anzahl Erwachsene', en: 'Number of adults' }[locale]}
                                                subtitle={
                                                    {
                                                        de: 'Die finale Personenanzahl kann im Nachgang noch angepasst werden.',
                                                        en: 'The final number of people can be adjusted later.',
                                                    }[locale]
                                                }
                                                value={field.state.value}
                                                min={1}
                                                disabled={busy}
                                                onChange={field.handleChange}
                                            />
                                        )}
                                    </form.Field>
                                    <form.Field name="discountedCount">
                                        {(field) => (
                                            <ParticipantCountField
                                                label={{ de: 'Anzahl Kinder', en: 'Number of children' }[locale]}
                                                subtitle={
                                                    {
                                                        de: 'Kinder bis 10 Jahre zählen in der Regel als halbe Person.',
                                                        en: 'Children up to 10 years old are generally counted as half a person.',
                                                    }[locale]
                                                }
                                                value={field.state.value}
                                                min={0}
                                                disabled={busy}
                                                onChange={field.handleChange}
                                            />
                                        )}
                                    </form.Field>
                                </div>
                            ) : null}

                            {step === 'location' ? (
                                <form.Field name="locationSearchText">
                                    {(field) => {
                                        const previousEventAddresses = loaderData.currentSession.user?.previousEventAddresses ?? [];
                                        return (
                                            <div className="grid gap-3">
                                                <p className="text-sm font-medium">
                                                    {
                                                        {
                                                            de: 'Gib deine vollständige Adresse mit Straße und Hausnummer an:',
                                                            en: 'Enter your full address including street and house number:',
                                                        }[locale]
                                                    }
                                                </p>
                                                <Combobox
                                                    filter={null}
                                                    items={suggestions.map((suggestion) => suggestion.displayText)}
                                                    value={values.exactEventAddress?.displayText ?? null}
                                                    inputValue={field.state.value}
                                                    onValueChange={(next) => {
                                                        if (next == null) return;
                                                        const match = suggestions.find((suggestion) => suggestion.displayText === next);
                                                        if (!match) return;
                                                        const address = addressFromSuggestion(match);
                                                        if (!address) {
                                                            toast.error(
                                                                {
                                                                    de: 'Bitte eine vollständige Adresse wählen.',
                                                                    en: 'Please choose a full address.',
                                                                }[locale],
                                                            );
                                                            return;
                                                        }
                                                        form.setFieldValue('exactEventAddress', address);
                                                        field.handleChange(match.displayText);
                                                    }}
                                                    onInputValueChange={(next) => {
                                                        field.handleChange(next);
                                                        if (values.exactEventAddress && next !== values.exactEventAddress.displayText) {
                                                            form.setFieldValue('exactEventAddress', null);
                                                        }
                                                    }}
                                                    itemToStringLabel={(item: string) => item}
                                                >
                                                    <ComboboxInput
                                                        className="w-full"
                                                        placeholder={
                                                            {
                                                                de: 'Musterstraße 1, 80331 München',
                                                                en: '123 Main Street, 12345 Springfield',
                                                            }[locale]
                                                        }
                                                        showClear={false}
                                                        disabled={busy}
                                                        required={!values.exactEventAddress}
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
                                                {previousEventAddresses.length > 0 ? (
                                                    <div className="grid gap-2">
                                                        <p className="text-sm font-medium">
                                                            {{ de: 'Frühere Adressen', en: 'Previous addresses' }[locale]}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {previousEventAddresses.map((address) => (
                                                                <SelectableChip
                                                                    key={[
                                                                        address.addressLine1,
                                                                        address.postCode,
                                                                        address.city,
                                                                        address.country,
                                                                    ].join('|')}
                                                                    label={address.displayText}
                                                                    icon={<MapPinIcon className="size-4" />}
                                                                    selected={
                                                                        values.exactEventAddress != null &&
                                                                        exactEventAddressEqual(values.exactEventAddress, address)
                                                                    }
                                                                    disabled={busy}
                                                                    onClick={() => {
                                                                        const next = addressFromPrevious(address);
                                                                        form.setFieldValue('exactEventAddress', next);
                                                                        field.handleChange(next.displayText);
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {values.exactEventAddress ? (
                                                    <StatusAlert tone="success">
                                                        {
                                                            {
                                                                de: 'Ausgewählte Adresse: ',
                                                                en: 'Selected address: ',
                                                            }[locale]
                                                        }
                                                        <span className="font-semibold text-foreground">
                                                            {values.exactEventAddress.displayText}
                                                        </span>
                                                    </StatusAlert>
                                                ) : null}
                                            </div>
                                        );
                                    }}
                                </form.Field>
                            ) : null}

                            {step === 'dateTime' ? (
                                <form.Field name="dateTime">
                                    {(field) => (
                                        <div className="grid max-w-md gap-4">
                                            <div className="grid gap-2">
                                                <span id="booking-request-date-label" className="text-sm font-medium">
                                                    {{ de: 'Datum', en: 'Date' }[locale]}
                                                </span>
                                                <DatePicker
                                                    value={field.state.value}
                                                    onValueChange={(day) => {
                                                        if (!day) return;
                                                        const next = new Date(day);
                                                        next.setHours(field.state.value.getHours(), field.state.value.getMinutes(), 0, 0);
                                                        field.handleChange(next);
                                                    }}
                                                    placeholder={{ de: 'Datum wählen', en: 'Pick a date' }[locale]}
                                                    locale={DATE_FNS_LOCALE[locale]}
                                                    className="w-full"
                                                    aria-labelledby="booking-request-date-label"
                                                    aria-required
                                                    disabled={busy || { before: new Date() }}
                                                />
                                            </div>
                                            {dateDistanceInDaysToToday(field.state.value, 'Europe/Berlin') > 21 ? (
                                                <StatusAlert tone="success">
                                                    {
                                                        {
                                                            de: 'Perfekt! Du bist genau richtig in der Zeit! Über 60% unserer Buchungen erfolgen mehr als 3 Wochen im Voraus.',
                                                            en: "Perfect! You've hit the nail on the head! Over 60% of our bookings are made more than 3 weeks in advance.",
                                                        }[locale]
                                                    }
                                                </StatusAlert>
                                            ) : null}
                                            <div className="grid gap-2">
                                                <span id="booking-request-time-label" className="text-sm font-medium">
                                                    {{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                                </span>
                                                <TimePicker
                                                    value={format(field.state.value, 'HH:mm')}
                                                    onValueChange={(time) => {
                                                        const [hoursRaw, minutesRaw] = time.split(':');
                                                        const hours = Number(hoursRaw);
                                                        const minutes = Number(minutesRaw);
                                                        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
                                                        const next = new Date(field.state.value);
                                                        next.setHours(hours, minutes, 0, 0);
                                                        field.handleChange(next);
                                                    }}
                                                    hourOptions={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]}
                                                    minuteOptions={[0, 15, 30, 45]}
                                                    hourAriaLabel={{ de: 'Stunde', en: 'Hour' }[locale]}
                                                    minuteAriaLabel={{ de: 'Minute', en: 'Minute' }[locale]}
                                                    className="w-full"
                                                    aria-labelledby="booking-request-time-label"
                                                    aria-required
                                                    disabled={busy}
                                                />
                                            </div>
                                            <StatusAlert tone="success">
                                                {
                                                    {
                                                        de: 'Die finale Uhrzeit kannst du mit dem Koch später kommunizieren.',
                                                        en: 'You can discuss the final time with the chef later.',
                                                    }[locale]
                                                }
                                            </StatusAlert>
                                        </div>
                                    )}
                                </form.Field>
                            ) : null}

                            {step === 'priceClass' ? (
                                <div className="grid gap-8">
                                    <form.Field name="priceClassType">
                                        {(field) => (
                                            <div className="grid gap-4 lg:grid-cols-3">
                                                {bookingRequestPriceClassTypes.map((priceClass) => {
                                                    const info = bookingRequestPriceClassInfo(priceClass, locale);
                                                    const selected = field.state.value === priceClass;
                                                    return (
                                                        <Card
                                                            key={priceClass}
                                                            className={
                                                                selected
                                                                    ? 'h-full justify-between border-primary shadow-md'
                                                                    : 'h-full justify-between border-border'
                                                            }
                                                        >
                                                            <CardHeader>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <CardTitle className="text-xl">{info.title}</CardTitle>
                                                                    {info.isPopular ? (
                                                                        <Badge className="border-green-300 bg-green-100 text-foreground">
                                                                            {{ de: 'Populär', en: 'Popular' }[locale]}
                                                                        </Badge>
                                                                    ) : null}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">{info.description}</p>
                                                            </CardHeader>
                                                            <CardContent className="grid flex-1 gap-2">
                                                                <p className="text-sm text-muted-foreground">
                                                                    {
                                                                        {
                                                                            de: 'Häufig gebucht für',
                                                                            en: 'Frequently booked for',
                                                                        }[locale]
                                                                    }
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {info.commonOccasions.map((occasion) => (
                                                                        <Badge key={occasion} variant="outline">
                                                                            {occasion}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </CardContent>
                                                            <CardFooter className="mt-auto flex flex-col items-stretch gap-4">
                                                                <p className="text-center">
                                                                    <span className="text-2xl font-semibold">
                                                                        {{ de: 'ab', en: 'starting at' }[locale]}{' '}
                                                                        {formatCurrency(info.minimumAmountPerPersonCents, { locale })}
                                                                    </span>{' '}
                                                                    <span className="text-sm text-muted-foreground">
                                                                        {{ de: 'pro Person', en: 'per person' }[locale]}
                                                                    </span>
                                                                </p>
                                                                <Button
                                                                    type="button"
                                                                    variant={selected ? 'default' : 'outline'}
                                                                    disabled={busy}
                                                                    onClick={() => field.handleChange(priceClass)}
                                                                >
                                                                    {selected
                                                                        ? { de: 'Ausgewählt', en: 'Selected' }[locale]
                                                                        : { de: 'Auswählen', en: 'Select' }[locale]}
                                                                </Button>
                                                            </CardFooter>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </form.Field>
                                    <div className="grid gap-4">
                                        <p className="text-2xl">
                                            {{ de: 'Was ist im Preis inklusive?', en: 'What is included in the price?' }[locale]}
                                        </p>
                                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                            {includedInPrice.map((option) => (
                                                <p key={option.title} className="flex items-center gap-4 text-lg">
                                                    {option.icon}
                                                    {option.title}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {step === 'preferences' ? (
                                <div className="grid gap-6">
                                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                        <Input
                                            value={customPreferenceText}
                                            onChange={(event) => setCustomPreferenceText(event.target.value)}
                                            placeholder={
                                                {
                                                    de: 'Präferenz (suchen oder hier eigene eingeben)',
                                                    en: 'Select from the options below or add your own one here',
                                                }[locale]
                                            }
                                            disabled={busy || values.preferences.length >= 4}
                                        />
                                        <Button
                                            type="button"
                                            className="justify-self-end"
                                            variant="default"
                                            disabled={busy || customPreferenceText.trim() === '' || values.preferences.length >= 4}
                                            onClick={() => {
                                                const next = textNormalizeTitled(customPreferenceText);
                                                if (!next) return;
                                                form.setFieldValue('preferences', [...values.preferences, next]);
                                                setCustomPreferenceText('');
                                            }}
                                        >
                                            {{ de: 'Eigene hinzufügen', en: 'Add custom' }[locale]}
                                        </Button>
                                    </div>
                                    <form.Field name="preferences">
                                        {(field) => (
                                            <div className="grid gap-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {preferenceOptions.map((option) => {
                                                        const selected = field.state.value.includes(option);
                                                        return (
                                                            <SelectableChip
                                                                key={option}
                                                                label={option}
                                                                selected={selected}
                                                                disabled={busy || (!selected && field.state.value.length >= 4)}
                                                                onClick={() => {
                                                                    if (selected) {
                                                                        field.handleChange(
                                                                            field.state.value.filter((item) => item !== option),
                                                                        );
                                                                        return;
                                                                    }
                                                                    if (field.state.value.length >= 4) return;
                                                                    field.handleChange([...field.state.value, option]);
                                                                    setCustomPreferenceText('');
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                {field.state.value.length >= 4 ? (
                                                    <StatusAlert tone="info">
                                                        {
                                                            {
                                                                de: 'Du hast die maximale Anzahl ausgewählter Präferenzen erreicht.',
                                                                en: 'You have reached the limit of 4 selected preferences.',
                                                            }[locale]
                                                        }
                                                    </StatusAlert>
                                                ) : null}
                                            </div>
                                        )}
                                    </form.Field>
                                </div>
                            ) : null}

                            {step === 'restrictions' ? (
                                <BookingRequestParticipantsRestrictionsEditor
                                    participants={participants}
                                    onChange={setParticipants}
                                    disabled={busy}
                                />
                            ) : null}

                            {step === 'message' ? (
                                <div className="grid gap-6">
                                    <form.Field name="originalMessage">
                                        {(field) => (
                                            <Textarea
                                                required
                                                value={field.state.value}
                                                onChange={(event) => field.handleChange(event.target.value)}
                                                placeholder={{ de: 'Nachricht an die Köche', en: 'Message for the chefs' }[locale]}
                                                disabled={busy}
                                                rows={8}
                                            />
                                        )}
                                    </form.Field>
                                    <div className="grid gap-3">
                                        <form.Field name="redeemCode">
                                            {(field) => (
                                                <label className="grid gap-1.5">
                                                    <span className="text-sm font-medium">
                                                        {
                                                            {
                                                                de: 'Gutschein oder Promocode einlösen',
                                                                en: 'Redeem voucher or promo code',
                                                            }[locale]
                                                        }
                                                    </span>
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                                        <Input
                                                            value={field.state.value}
                                                            onChange={(event) => {
                                                                const next = event.target.value;
                                                                field.handleChange(next);
                                                                setRedeemInvalid(false);
                                                                if (confirmedDiscount && confirmedDiscount.redeemCode !== next.trim()) {
                                                                    setConfirmedDiscount(null);
                                                                }
                                                            }}
                                                            placeholder={{ de: 'Code eingeben', en: 'Enter code' }[locale]}
                                                            disabled={busy || redeemBusy}
                                                            autoComplete="off"
                                                            spellCheck={false}
                                                            aria-invalid={redeemInvalid || undefined}
                                                            className="sm:flex-1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="default"
                                                            className="self-end"
                                                            disabled={
                                                                busy ||
                                                                redeemBusy ||
                                                                field.state.value.trim().length === 0 ||
                                                                confirmedDiscount?.redeemCode === field.state.value.trim()
                                                            }
                                                            onClick={() => void redeemDiscount(field.state.value)}
                                                        >
                                                            {redeemBusy
                                                                ? { de: 'Prüfen…', en: 'Checking…' }[locale]
                                                                : { de: 'Einlösen', en: 'Redeem' }[locale]}
                                                        </Button>
                                                    </div>
                                                </label>
                                            )}
                                        </form.Field>
                                        {redeemInvalid ? (
                                            <StatusAlert tone="error">
                                                {{ de: 'Rabattcode ungültig.', en: 'This code is invalid.' }[locale]}
                                            </StatusAlert>
                                        ) : null}
                                        {confirmedDiscount ? (
                                            <StatusAlert tone="success" title={{ de: 'Rabatt gesichert', en: 'Discount secured' }[locale]}>
                                                {
                                                    {
                                                        de: (
                                                            <p>
                                                                Dein Vorteil in Höhe von{' '}
                                                                <span className="font-semibold text-foreground">
                                                                    {formatCurrency(confirmedDiscount.amountCents, { locale })}
                                                                </span>{' '}
                                                                ist gesichert und wird automatisch von den Preisen deiner Angebote
                                                                abgezogen.
                                                            </p>
                                                        ),
                                                        en: (
                                                            <p>
                                                                Your benefit of{' '}
                                                                <span className="font-semibold text-foreground">
                                                                    {formatCurrency(confirmedDiscount.amountCents, { locale })}
                                                                </span>{' '}
                                                                is secured and will be automatically deducted from your offer prices.
                                                            </p>
                                                        ),
                                                    }[locale]
                                                }
                                            </StatusAlert>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            {step === 'auth' ? (
                                <div className="mx-auto grid w-full max-w-md gap-4">
                                    <AuthIdentityGate
                                        initialSession={session}
                                        onSessionChange={setSession}
                                        onBusyChange={setAuthBusy}
                                        externalSubmit
                                        onReady={() => {
                                            trySubmit();
                                        }}
                                        footer={() => <AuthPasskeyLogOn />}
                                    />
                                </div>
                            ) : null}
                        </BookingRequestFormStepLayout>
                    </div>
                </div>

                {step !== 'auth' ? (
                    <BookingRequestFormBackNext
                        back={
                            step === 'occasion'
                                ? undefined
                                : {
                                      label: { de: 'Zurück', en: 'Back' }[locale],
                                      onClick: goBack,
                                      disabled: busy,
                                  }
                        }
                        next={{
                            label:
                                step === 'message' && signedIn
                                    ? { de: 'Anfrage senden', en: 'Send request' }[locale]
                                    : { de: 'Weiter', en: 'Next' }[locale],
                            onClick: goNext,
                            disabled: nextDisabled,
                            showArrow: !(step === 'message' && signedIn),
                        }}
                    />
                ) : null}

                {step === 'auth' ? (
                    <BookingRequestFormBackNext
                        back={{
                            label: { de: 'Zurück', en: 'Back' }[locale],
                            onClick: goBack,
                            disabled: busy || authBusy,
                        }}
                        next={
                            sessionAuthPhase(session) === 'register'
                                ? {
                                      type: 'submit',
                                      form: AUTH_USER_PROFILE_FORM_ID,
                                      label: { de: 'Konto erstellen', en: 'Create account' }[locale],
                                      disabled: busy || authBusy,
                                      showArrow: false,
                                  }
                                : undefined
                        }
                    />
                ) : null}
            </div>
        </main>
    );
}

function completedStepSummary(
    step: ContentStep,
    values: BookingFormValues,
    participants: readonly BookingRequestParticipantDraft[],
    locale: Locale,
    timeZone: string,
): { title: string; summary: string } {
    const { sideBarTitle } = stepCopy(step, locale);
    switch (step) {
        case 'occasion':
            return { title: sideBarTitle, summary: values.occasion };
        case 'participants':
            return {
                title: sideBarTitle,
                summary: formatParticipants({ adultCount: values.adultCount, discountedCount: values.discountedCount }, { locale }),
            };
        case 'location':
            return { title: sideBarTitle, summary: values.exactEventAddress?.displayText ?? values.locationSearchText };
        case 'dateTime':
            return {
                title: sideBarTitle,
                summary: formatDate(values.dateTime, { locale, timeZone, dateStyle: 'long', weekday: true }),
            };
        case 'priceClass':
            return {
                title: sideBarTitle,
                summary: values.priceClassType ? bookingRequestPriceClassInfo(values.priceClassType, locale).title : '—',
            };
        case 'preferences':
            return {
                title: sideBarTitle,
                summary: values.preferences.length > 0 ? values.preferences.join(', ') : { de: 'Keine', en: 'None' }[locale],
            };
        case 'restrictions': {
            const selected = participants.flatMap((participant) => participant.restrictions);
            return {
                title: sideBarTitle,
                summary: selected.length > 0 ? selected.join(', ') : { de: 'Keine', en: 'None' }[locale],
            };
        }
        case 'message':
            return { title: sideBarTitle, summary: '…' };
    }
}

function ParticipantCountField({
    label,
    subtitle,
    value,
    min,
    disabled,
    onChange,
}: {
    label: string;
    subtitle: string;
    value: number;
    min: number;
    disabled: boolean;
    onChange: (next: number) => void;
}) {
    return (
        <div className="grid w-full gap-3">
            <div className="grid gap-1">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{subtitle}</span>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-fit">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={disabled || value <= min}
                    aria-label={`- ${label}`}
                    onClick={() => onChange(Math.max(min, value - 1))}
                >
                    <MinusIcon className="size-4" />
                </Button>
                <Input
                    type="number"
                    min={min}
                    value={value}
                    disabled={disabled}
                    className="min-w-0 flex-1 text-center [appearance:textfield] sm:w-28 sm:flex-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label={label}
                    onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isFinite(next)) return;
                        onChange(Math.max(min, Math.floor(next)));
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={disabled}
                    aria-label={`+ ${label}`}
                    onClick={() => onChange(value + 1)}
                >
                    <PlusIcon className="size-4" />
                </Button>
            </div>
        </div>
    );
}
