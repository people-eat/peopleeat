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
import type { ReactNode } from 'react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useClient, useMutation, useQuery } from 'urql';

import { t } from '../../i18n/t';
import type {
    BookingRequestFormFunnelStep,
    BookingRequestFormLocationSettingChoice,
    BookingRequestFormPriceClassType,
    BookingRequestParticipantDraft,
    BookingRequestSettingChoice,
    ExpansionMarket,
    Locale,
} from '../../shared';
import {
    bookingRequestFormFunnelArea,
    bookingRequestMarketClosedFromMessage,
    bookingRequestParticipantsFromCounts,
    bookingRequestPriceClassInfo,
    bookingRequestPriceClassTypes,
    bookingRequestSettingFromChoice,
    bookingRequestSettingLabel,
    dateDistanceInDaysToToday,
    defaultBookingRequestOccasions,
    defaultBookingRequestPreferences,
    expansionMarketComingToPhrase,
    expansionMarketFromCountry,
    featureToggleIsActive,
    formatCurrency,
    formatDate,
    formatParticipants,
    textNormalizeTitled,
} from '../../shared';
import { AppImage } from '../components/AppImage';
import { AUTH_USER_PROFILE_FORM_ID, AuthIdentityGate } from '../components/auth/AuthIdentityGate';
import { AuthIdentityGateLogOnFooter } from '../components/auth/AuthIdentityGateLogOnFooter';
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
import { BookingRequestMarketClosedNotice } from '../components/BookingRequestMarketClosedNotice';
import { BookingRequestParticipantsRestrictionsEditor } from '../components/BookingRequestParticipantsRestrictionsEditor';
import { BookingRequestSettingPicker } from '../components/BookingRequestSettingPicker';
import { SelectableChip } from '../components/SelectableChip';
import type {
    GqlCAuthSessionFieldsFragment,
    GqlCBookingRequestFormPageQuery,
    GqlCLocationSuggestion,
    GqlCUserBookingRequestCreate,
    GqlCUserBookingRequestExactEventAddressInput,
} from '../graphql/generated';
import {
    BookingRequestFormCookDocument,
    BookingRequestFormCreateDocument,
    BookingRequestFormFunnelTrackDocument,
    BookingRequestFormLocationSuggestionsDocument,
    BookingRequestFormSessionDiscountDocument,
} from '../graphql/generated';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { useTimeZone } from '../hooks/useTimeZone';
import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_LOGO_SRC_SET, SITE_NAME } from '../seo/seoConstants';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { BookingRequestFormSearch } from './bookingRequestFormSearch';
import {
    bookingRequestFormClampDateTime,
    bookingRequestFormContentSteps,
    bookingRequestFormDateTimeBoundsFromSearch,
    bookingRequestFormHourOptions,
    bookingRequestFormMinuteOptions,
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
    settingChoice: BookingRequestSettingChoice;
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

function marketComingTo(market: ExpansionMarket, locale: Locale): string {
    return expansionMarketComingToPhrase(market, locale);
}

function stepCopy(
    step: ContentStep | 'auth',
    locale: Locale,
    cookFirstName?: string | null,
): { sideBarTitle: string; title: string; subTitle?: string } {
    const cookName = cookFirstName?.trim() || null;
    const ns = 'publicBooking' as const;
    switch (step) {
        case 'occasion':
            return {
                sideBarTitle: t(locale, ns, 'form.steps.occasion.sideBarTitle'),
                title: t(locale, ns, 'form.steps.occasion.title'),
            };
        case 'participants':
            return {
                sideBarTitle: t(locale, ns, 'form.steps.participants.sideBarTitle'),
                title: t(locale, ns, 'form.steps.participants.title'),
            };
        case 'location':
            return {
                sideBarTitle: t(locale, ns, 'form.steps.location.sideBarTitle'),
                title: t(locale, ns, 'form.steps.location.title'),
            };
        case 'dateTime':
            return {
                sideBarTitle: t(locale, ns, 'form.steps.dateTime.sideBarTitle'),
                title: t(locale, ns, 'form.steps.dateTime.title'),
                subTitle: t(locale, ns, 'form.steps.dateTime.subTitle'),
            };
        case 'priceClass':
            return {
                sideBarTitle: t(locale, ns, 'form.steps.priceClass.sideBarTitle'),
                title: t(locale, ns, 'form.steps.priceClass.title'),
                subTitle: cookName ? t(locale, ns, 'form.steps.priceClass.subTitleCook', { cookName }) : undefined,
            };
        case 'preferences':
            return {
                sideBarTitle: t(locale, ns, 'form.steps.preferences.sideBarTitle'),
                title: t(locale, ns, 'form.steps.preferences.title'),
                subTitle: cookName
                    ? t(locale, ns, 'form.steps.preferences.subTitleCook', { cookName })
                    : t(locale, ns, 'form.steps.preferences.subTitle'),
            };
        case 'restrictions':
            return {
                sideBarTitle: t(locale, ns, 'form.steps.restrictions.sideBarTitle'),
                title: t(locale, ns, 'form.steps.restrictions.title'),
                subTitle: t(locale, ns, 'form.steps.restrictions.subTitle'),
            };
        case 'message':
            return {
                sideBarTitle: t(locale, ns, 'form.steps.message.sideBarTitle'),
                title: t(locale, ns, 'form.steps.message.title'),
                subTitle: cookName
                    ? t(locale, ns, 'form.steps.message.subTitleCook', { cookName })
                    : t(locale, ns, 'form.steps.message.subTitle'),
            };
        case 'auth':
            return {
                sideBarTitle: '',
                title: t(locale, ns, 'form.steps.auth.title'),
                subTitle: t(locale, ns, 'form.steps.auth.subTitle'),
            };
    }
}

type ConfirmedDiscount = {
    redeemCode: string;
    amountCents: number;
};

function createInputFromValues(
    values: BookingFormValues,
    participants: readonly BookingRequestParticipantDraft[],
    confirmedDiscount: ConfirmedDiscount | null,
    settingEnabled: boolean,
    requestedCookId?: string | null,
    requestedMenuId?: string | null,
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
        setting: settingEnabled ? bookingRequestSettingFromChoice(values.settingChoice) : null,
        requestedCookId: requestedCookId ?? null,
        requestedMenuId: requestedMenuId ?? null,
    };
}

function bookingRequestFormFunnelTarget(search: BookingRequestFormSearch) {
    return {
        ...(search.cookId ? { cookId: search.cookId } : {}),
        ...(search.menuId ? { menuId: search.menuId } : {}),
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
    const { t: tBooking } = useT('publicBooking');
    const { t: tCommon } = useT('common');
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/booking-request/form' });
    const [session, setSession] = useState<GqlCAuthSessionFieldsFragment>(loaderData.currentSession);
    const signedIn = sessionAuthPhase(session) === 'signedIn';
    const restrictionsEnabled = featureToggleIsActive(session.activeFeatureToggleKeys, 'BOOKING_REQUEST_RESTRICTIONS');
    const settingEnabled = featureToggleIsActive(session.activeFeatureToggleKeys, 'BOOKING_REQUEST_SETTING');
    const cookDirectToggleOn = featureToggleIsActive(session.activeFeatureToggleKeys, 'BOOKING_REQUEST_COOK_DIRECT');
    const [{ data: cookData, fetching: cookFetching }] = useQuery({
        query: BookingRequestFormCookDocument,
        variables: { cookId: search.cookId ?? '' },
        pause: search.cookId == null,
    });
    const requestedCook = cookData?.publicCook.findOne ?? null;
    const honorDirect = cookDirectToggleOn && requestedCook?.canReceiveDirectRequests === true;
    const waitingForDirectCook = search.cookId != null && cookDirectToggleOn && cookFetching;
    const leftoverCookId = search.cookId != null && !honorDirect && !waitingForDirectCook;
    const requestedMenu =
        honorDirect && search.menuId != null ? (requestedCook?.menus.find((menu) => menu.menuId === search.menuId) ?? null) : null;
    const leftoverMenuId = honorDirect && search.menuId != null && requestedMenu == null && !waitingForDirectCook;
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
            settingChoice: seededValues.settingChoice,
        } satisfies BookingFormValues,
    });

    const values = useSelector(form.store, (state) => state.values);
    const dateTimeBounds = bookingRequestFormDateTimeBoundsFromSearch(search);
    const datePickerMin = (() => {
        const today = new Date();
        if (dateTimeBounds.minDateTime && dateTimeBounds.minDateTime.getTime() > today.getTime()) {
            return dateTimeBounds.minDateTime;
        }
        return today;
    })();

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
                interaction: {
                    type,
                    step: funnelStep,
                    ...bookingRequestFormFunnelTarget(search),
                },
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
        settingChoice: values.settingChoice,
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
            settingChoice: BookingRequestSettingChoice;
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
                settingChoice: settingEnabled ? draft.settingChoice : null,
            },
            step: draft.step,
            minDateTime: search.minDateTime,
            maxDateTime: search.maxDateTime,
            cookId: search.cookId,
            menuId: search.menuId,
        });
        if (bookingRequestFormSearchEqual(nextSearch, search)) return;
        void navigate({ search: nextSearch, replace: true });
    }, [debouncedDraftKey, navigate, search, settingEnabled]);

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
                const closedMarket = bookingRequestMarketClosedFromMessage(result.error?.message);
                toast.error(
                    closedMarket
                        ? tBooking('marketClosed.toast', { comingTo: marketComingTo(closedMarket, locale) })
                        : tBooking('createFailed'),
                );
                return;
            }
            toast.success(tBooking('created'));
            trackFunnelStep('step_completed', 'created');
            await navigate({
                to: '/{-$locale}/booking-request/$bookingRequestId/submitted',
                params: { bookingRequestId: created.referenceId },
            });
        } finally {
            setBusy(false);
        }
    }

    function trySubmit() {
        const selectedClosedMarket = values.exactEventAddress ? expansionMarketFromCountry(values.exactEventAddress.country) : null;
        if (selectedClosedMarket) {
            toast.error(tBooking('marketClosed.toast', { comingTo: marketComingTo(selectedClosedMarket, locale) }));
            return;
        }
        if (values.redeemCode.trim().length > 0 && confirmedDiscount?.redeemCode !== values.redeemCode.trim()) {
            toast.error(tBooking('form.redeemFirst'));
            return;
        }
        const input = createInputFromValues(
            values,
            participants,
            confirmedDiscount,
            settingEnabled,
            honorDirect ? requestedCook?.cookId : null,
            requestedMenu?.menuId ?? null,
        );
        if (!input) {
            toast.error(tBooking('requiredFields'));
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
    }, [seededValues.redeemCode]);

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
        if (step === 'location' && settingEnabled) {
            const setting: BookingRequestFormLocationSettingChoice =
                values.settingChoice === 'INDOOR' || values.settingChoice === 'OUTDOOR' || values.settingChoice === 'LATER'
                    ? values.settingChoice
                    : 'skipped';
            void trackFunnelInteraction({
                input: {
                    webPageKey: 'BOOKING_REQUEST_FORM',
                    area: bookingRequestFormFunnelArea,
                    interaction: {
                        type: 'step_completed',
                        step: 'location',
                        setting,
                        ...bookingRequestFormFunnelTarget(search),
                    },
                },
            });
        } else {
            trackFunnelStep('step_completed', step);
        }
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
    const cookFirstName = honorDirect ? (requestedCook?.user.display ?? null) : null;
    const copy = stepCopy(step === 'auth' ? 'auth' : step, locale, cookFirstName);
    const defaultPreferences = defaultBookingRequestPreferences(locale);
    const preferenceOptionsCustom = values.preferences.filter((preference) => !defaultPreferences.includes(preference));
    const preferenceOptions = [...defaultPreferences, ...preferenceOptionsCustom].filter((option) =>
        option.toLowerCase().includes(customPreferenceText.toLowerCase()),
    );

    const includedInPrice: { title: string; icon: ReactNode }[] = [
        { title: tBooking('form.included.ingredients'), icon: <CarrotIcon className="size-8" strokeWidth={1.5} /> },
        { title: tBooking('form.included.workTime'), icon: <ClockIcon className="size-8" strokeWidth={1.5} /> },
        { title: tBooking('form.included.serving'), icon: <HandPlatterIcon className="size-8" strokeWidth={1.5} /> },
        { title: tBooking('form.included.cleanKitchen'), icon: <DropletIcon className="size-8" strokeWidth={1.5} /> },
    ];

    const closedMarket = values.exactEventAddress ? expansionMarketFromCountry(values.exactEventAddress.country) : null;
    const nextDisabled =
        busy ||
        (step === 'occasion' && !values.occasion.trim()) ||
        (step === 'location' && (!values.exactEventAddress || Boolean(closedMarket))) ||
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
                <Button type="button" variant="ghost" size="icon" asChild aria-label={tCommon('close')}>
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
                            notice={
                                leftoverCookId || (honorDirect && requestedCook) || (leftoverMenuId && requestedCook) ? (
                                    <div className="flex flex-col gap-3">
                                        {leftoverCookId ? (
                                            <StatusAlert tone="info">{tBooking('form.leftoverCook')}</StatusAlert>
                                        ) : null}
                                        {honorDirect && requestedCook ? (
                                            <StatusAlert
                                                tone="info"
                                                title={tBooking('form.direct.title', { cookName: requestedCook.user.display })}
                                            >
                                                {requestedMenu
                                                    ? tBooking('form.direct.bodyWithMenu', { menuTitle: requestedMenu.title })
                                                    : tBooking('form.direct.body')}
                                            </StatusAlert>
                                        ) : null}
                                        {leftoverMenuId && requestedCook ? (
                                            <StatusAlert tone="info">
                                                {tBooking('form.leftoverMenu', { cookName: requestedCook.user.display })}
                                            </StatusAlert>
                                        ) : null}
                                    </div>
                                ) : undefined
                            }
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
                                                    {tBooking('form.steps.occasion.hint')}
                                                </span>
                                                <Input
                                                    value={field.state.value}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                    placeholder={tBooking('form.steps.occasion.placeholder')}
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
                                                label={tBooking('form.steps.participants.adults')}
                                                subtitle={tBooking('form.steps.participants.adultsHint')}
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
                                                label={tBooking('form.steps.participants.children')}
                                                subtitle={tBooking('form.steps.participants.childrenHint')}
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
                                                <p className="text-sm font-medium">{tBooking('form.steps.location.hint')}</p>
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
                                                            toast.error(tBooking('pickFullAddress'));
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
                                                        placeholder={tBooking('addressPlaceholder')}
                                                        showClear={false}
                                                        disabled={busy}
                                                        required={!values.exactEventAddress}
                                                    />
                                                    <ComboboxContent>
                                                        <ComboboxEmpty>
                                                            {suggestionsFetching ? tBooking('searching') : tBooking('noMatches')}
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
                                                            {tBooking('form.steps.location.previousAddresses')}
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
                                                    closedMarket ? (
                                                        <BookingRequestMarketClosedNotice market={closedMarket} />
                                                    ) : (
                                                        <StatusAlert tone="success">
                                                            {tBooking('form.steps.location.selectedAddress')}
                                                            <span className="font-semibold text-foreground">
                                                                {values.exactEventAddress.displayText}
                                                            </span>
                                                        </StatusAlert>
                                                    )
                                                ) : null}
                                                {settingEnabled && values.exactEventAddress ? (
                                                    <form.Field name="settingChoice">
                                                        {(settingField) => (
                                                            <BookingRequestSettingPicker
                                                                locale={locale}
                                                                value={settingField.state.value}
                                                                disabled={busy}
                                                                onChange={(next) => settingField.handleChange(next)}
                                                            />
                                                        )}
                                                    </form.Field>
                                                ) : null}
                                                {honorDirect && values.exactEventAddress ? (
                                                    <p className="text-sm text-muted-foreground">{tBooking('form.direct.farVenue')}</p>
                                                ) : null}
                                            </div>
                                        );
                                    }}
                                </form.Field>
                            ) : null}

                            {step === 'dateTime' ? (
                                <form.Field name="dateTime">
                                    {(field) => {
                                        const hourOptions = bookingRequestFormHourOptions(field.state.value, dateTimeBounds);
                                        const minuteOptions = bookingRequestFormMinuteOptions(
                                            field.state.value,
                                            field.state.value.getHours(),
                                            dateTimeBounds,
                                        );
                                        const dateDisabled = [
                                            { before: datePickerMin },
                                            ...(dateTimeBounds.maxDateTime ? [{ after: dateTimeBounds.maxDateTime }] : []),
                                        ];
                                        return (
                                            <div className="grid max-w-md gap-4">
                                                <div className="grid gap-2">
                                                    <span id="booking-request-date-label" className="text-sm font-medium">
                                                        {tBooking('date')}
                                                    </span>
                                                    <DatePicker
                                                        value={field.state.value}
                                                        onValueChange={(day) => {
                                                            if (!day) return;
                                                            const next = new Date(day);
                                                            next.setHours(
                                                                field.state.value.getHours(),
                                                                field.state.value.getMinutes(),
                                                                0,
                                                                0,
                                                            );
                                                            field.handleChange(bookingRequestFormClampDateTime(next, dateTimeBounds));
                                                        }}
                                                        placeholder={tBooking('form.steps.dateTime.pickDate')}
                                                        locale={DATE_FNS_LOCALE[locale]}
                                                        className="w-full"
                                                        aria-labelledby="booking-request-date-label"
                                                        aria-required
                                                        startMonth={datePickerMin}
                                                        endMonth={dateTimeBounds.maxDateTime}
                                                        disabled={busy || dateDisabled}
                                                    />
                                                </div>
                                                {dateDistanceInDaysToToday(field.state.value, 'Europe/Berlin') > 21 ? (
                                                    <StatusAlert tone="success">{tBooking('form.steps.dateTime.earlyBooking')}</StatusAlert>
                                                ) : null}
                                                <div className="grid gap-2">
                                                    <span id="booking-request-time-label" className="text-sm font-medium">
                                                        {tBooking('form.steps.dateTime.time')}
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
                                                            field.handleChange(bookingRequestFormClampDateTime(next, dateTimeBounds));
                                                        }}
                                                        hourOptions={hourOptions}
                                                        minuteOptions={minuteOptions}
                                                        hourAriaLabel={tCommon('dateTime.hour')}
                                                        minuteAriaLabel={tCommon('dateTime.minute')}
                                                        className="w-full"
                                                        aria-labelledby="booking-request-time-label"
                                                        aria-required
                                                        disabled={busy}
                                                    />
                                                </div>
                                                <StatusAlert tone="success">{tBooking('form.steps.dateTime.timeLater')}</StatusAlert>
                                            </div>
                                        );
                                    }}
                                </form.Field>
                            ) : null}

                            {step === 'priceClass' ? (
                                <div className="grid gap-8">
                                    <form.Field name="priceClassType">
                                        {(field) => (
                                            <div className="@container w-full min-w-0">
                                                <div className="grid gap-4 @3xl:grid-cols-3">
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
                                                                                {tBooking('popular')}
                                                                            </Badge>
                                                                        ) : null}
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">{info.description}</p>
                                                                </CardHeader>
                                                                <CardContent className="grid flex-1 content-start gap-2">
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {tBooking('form.steps.priceClass.frequentlyBooked')}
                                                                    </p>
                                                                    <div className="flex flex-wrap items-start gap-2">
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
                                                                            {tBooking('startingAt')}{' '}
                                                                            {formatCurrency(info.minimumAmountPerPersonCents, { locale })}
                                                                        </span>{' '}
                                                                        <span className="text-sm text-muted-foreground">
                                                                            {tBooking('perPerson')}
                                                                        </span>
                                                                    </p>
                                                                    <Button
                                                                        type="button"
                                                                        variant={selected ? 'default' : 'outline'}
                                                                        disabled={busy}
                                                                        onClick={() => field.handleChange(priceClass)}
                                                                    >
                                                                        {selected ? tBooking('selected') : tBooking('select')}
                                                                    </Button>
                                                                </CardFooter>
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </form.Field>
                                    <div className="grid gap-4">
                                        <p className="text-2xl">{tBooking('form.included.heading')}</p>
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
                                            placeholder={tBooking('form.steps.preferences.searchPlaceholder')}
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
                                            {tBooking('form.steps.preferences.addCustom')}
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
                                                    <StatusAlert tone="info">{tBooking('form.steps.preferences.maxReached')}</StatusAlert>
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
                                                placeholder={
                                                    cookFirstName
                                                        ? tBooking('form.steps.message.placeholderCook', { cookName: cookFirstName })
                                                        : tBooking('form.steps.message.placeholder')
                                                }
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
                                                        {tBooking('form.steps.message.redeemLabel')}
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
                                                            placeholder={tBooking('form.steps.message.redeemPlaceholder')}
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
                                                                ? tBooking('form.steps.message.checking')
                                                                : tBooking('form.steps.message.redeem')}
                                                        </Button>
                                                    </div>
                                                </label>
                                            )}
                                        </form.Field>
                                        {redeemInvalid ? (
                                            <StatusAlert tone="error">{tBooking('form.steps.message.invalid')}</StatusAlert>
                                        ) : null}
                                        {confirmedDiscount ? (
                                            <StatusAlert tone="success" title={tBooking('form.steps.message.discountSecured')}>
                                                <p>
                                                    {tBooking('form.steps.message.discountLead')}{' '}
                                                    <span className="font-semibold text-foreground">
                                                        {formatCurrency(confirmedDiscount.amountCents, { locale })}
                                                    </span>{' '}
                                                    {tBooking('form.steps.message.discountTrail')}
                                                </p>
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
                                        footer={(gateSession, sessionRefresh) => (
                                            <AuthIdentityGateLogOnFooter session={gateSession} sessionRefresh={sessionRefresh} />
                                        )}
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
                                      label: tBooking('back'),
                                      onClick: goBack,
                                      disabled: busy,
                                  }
                        }
                        next={{
                            label:
                                step === 'message' && signedIn
                                    ? honorDirect && requestedCook
                                        ? tBooking('form.sendToCook', { cookName: requestedCook.user.display })
                                        : tBooking('form.send')
                                    : tBooking('next'),
                            onClick: goNext,
                            disabled: nextDisabled,
                            showArrow: !(step === 'message' && signedIn),
                        }}
                    />
                ) : null}

                {step === 'auth' ? (
                    <BookingRequestFormBackNext
                        back={{
                            label: tBooking('back'),
                            onClick: goBack,
                            disabled: busy || authBusy,
                        }}
                        next={
                            sessionAuthPhase(session) === 'register'
                                ? {
                                      type: 'submit',
                                      form: AUTH_USER_PROFILE_FORM_ID,
                                      label: tBooking('form.createAccount'),
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
        case 'location': {
            const address = values.exactEventAddress?.displayText ?? values.locationSearchText;
            const settingLabel =
                values.settingChoice === 'INDOOR' || values.settingChoice === 'OUTDOOR'
                    ? bookingRequestSettingLabel(values.settingChoice, locale)
                    : null;
            return { title: sideBarTitle, summary: settingLabel ? `${address} · ${settingLabel}` : address };
        }
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
                summary: values.preferences.length > 0 ? values.preferences.join(', ') : t(locale, 'publicBooking', 'none'),
            };
        case 'restrictions': {
            const selected = participants.flatMap((participant) => participant.restrictions);
            return {
                title: sideBarTitle,
                summary: selected.length > 0 ? selected.join(', ') : t(locale, 'publicBooking', 'none'),
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
