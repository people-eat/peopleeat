import { useForm, useSelector } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { bookingRequestParticipantsFromCounts, formatDateTime, formatParticipants, userDisplayName } from '../../../shared';
import type { BookingRequestParticipantDraft, Locale } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Checkbox } from '../../components/base/checkbox';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Input } from '../../components/base/input';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestParticipantsRestrictionsEditor } from '../../components/BookingRequestParticipantsRestrictionsEditor';
import {
    AdminBookingRequestCreateCooksInTravelRadiusDocument,
    AdminBookingRequestCreateCustomerSearchDocument,
    AdminBookingRequestCreateDocument,
    AdminBookingRequestCreateLocationSuggestionsDocument,
    AdminBookingRequestCreatePrefillUserDocument,
} from '../../graphql/generated';
import type {
    GqlCAdminBookingRequestCreateCooksInTravelRadiusQuery,
    GqlCAdminBookingRequestExactEventAddressInput,
    GqlCLocationSuggestion,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';

export const adminBookingRequestCreatePageTitle = { de: 'Buchungsanfrage anlegen', en: 'Create booking request' } as const;
export const adminBookingRequestCreatePageDescription = {
    de: 'Anfrage manuell für einen bestehenden Kunden anlegen.',
    en: 'Create a request manually for an existing customer.',
} as const;

/** Matches server `LARGE_GROUP_PARTICIPANT_THRESHOLD` (cashcow / admin-approved path). */
const LARGE_GROUP_PARTICIPANT_THRESHOLD = 12;

const CREATE_FORM_ID = 'admin-booking-request-create-form';

export type AdminBookingRequestCreateSearch = {
    userId?: string;
};

export function parseAdminBookingRequestCreateSearch(search: Record<string, unknown>): AdminBookingRequestCreateSearch {
    const userId = typeof search.userId === 'string' && search.userId.length > 0 ? search.userId : undefined;
    return { userId };
}

type CustomerOption = {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress: string | null;
};

type FormValues = {
    customer: CustomerOption | null;
    occasion: string;
    dateTime: Date | undefined;
    exactEventAddress: GqlCAdminBookingRequestExactEventAddressInput | null;
    originalMessage: string;
    adultCount: number;
    discountedCount: number;
};

type CookInRadiusPreview = NonNullable<
    NonNullable<GqlCAdminBookingRequestCreateCooksInTravelRadiusQuery['currentSession']['user']>['admin']
>['cooksInTravelRadius'][number];

const EMPTY_COOKS_IN_RADIUS: CookInRadiusPreview[] = [];

function emptyFormValues(): FormValues {
    return {
        customer: null,
        occasion: '',
        dateTime: undefined,
        exactEventAddress: null,
        originalMessage: '',
        adultCount: 2,
        discountedCount: 0,
    };
}

function addressFromSuggestion(suggestion: GqlCLocationSuggestion): GqlCAdminBookingRequestExactEventAddressInput | null {
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

function customerLabel(customer: CustomerOption): string {
    return `${userDisplayName(customer)} · ${customer.emailAddress ?? '—'}`;
}

function formatTravelDistanceKm(km: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    }).format(km);
}

function requiredTrimmed(value: string, locale: Locale, labels: { de: string; en: string }): string | undefined {
    if (value.trim().length === 0) return labels[locale];
    return undefined;
}

function fieldErrorText(errors: unknown[]): string | undefined {
    const first = errors[0];
    return typeof first === 'string' && first.length > 0 ? first : undefined;
}

export function AdminBookingRequestCreatePage({ search }: { search: AdminBookingRequestCreateSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const [, createBooking] = useMutation(AdminBookingRequestCreateDocument);
    const restrictionsEnabled = useFeatureToggleActive('BOOKING_REQUEST_RESTRICTIONS');

    const [customerSearchText, setCustomerSearchText] = useState('');
    const [locationSearchText, setLocationSearchText] = useState('');
    const [selectedCookIds, setSelectedCookIds] = useState<string[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const [cookSelectionError, setCookSelectionError] = useState<string | null>(null);
    const [prefillApplied, setPrefillApplied] = useState(false);
    const [participants, setParticipants] = useState<BookingRequestParticipantDraft[]>(() =>
        bookingRequestParticipantsFromCounts({ adultCount: 2, discountedCount: 0, locale }),
    );
    const selectedCookIdsRef = useRef(selectedCookIds);
    const cooksInRadiusCountRef = useRef(0);
    selectedCookIdsRef.current = selectedCookIds;

    const form = useForm({
        defaultValues: emptyFormValues(),
        onSubmit: ({ value }) => {
            if (busy) return;

            const participantCount = value.adultCount + value.discountedCount;
            const isLargeGroup = participantCount >= LARGE_GROUP_PARTICIPANT_THRESHOLD;
            const largeGroupNeedsCook = isLargeGroup && cooksInRadiusCountRef.current > 0 && selectedCookIdsRef.current.length === 0;
            if (largeGroupNeedsCook) {
                setCookSelectionError(
                    {
                        de: 'Bei Großgruppen bitte mindestens einen Koch auswählen.',
                        en: 'For large groups, please select at least one chef.',
                    }[locale],
                );
                return;
            }

            setCookSelectionError(null);
            setError(false);
            setConfirmOpen(true);
        },
    });

    const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts);
    const values = useSelector(form.store, (state) => state.values);
    const customer = values.customer;
    const exactEventAddress = values.exactEventAddress;
    const adultCount = values.adultCount;
    const discountedCount = values.discountedCount;

    useEffect(() => {
        setParticipants((previous) =>
            bookingRequestParticipantsFromCounts({
                adultCount,
                discountedCount,
                locale,
                previous,
            }),
        );
    }, [adultCount, discountedCount, locale]);

    const debouncedCustomerSearch = useDebouncedValue(customerSearchText, 300);
    const debouncedLocationSearch = useDebouncedValue(locationSearchText, 300);

    const participantCount = adultCount + discountedCount;
    const isLargeGroup = participantCount >= LARGE_GROUP_PARTICIPANT_THRESHOLD;
    const venueKey = exactEventAddress ? `${exactEventAddress.latitude},${exactEventAddress.longitude}` : '';

    const [{ data: prefillData }] = useQuery({
        query: AdminBookingRequestCreatePrefillUserDocument,
        variables: { userId: search.userId ?? '' },
        pause: !search.userId || prefillApplied,
    });

    useEffect(() => {
        if (prefillApplied || !search.userId) return;
        if (!prefillData) return;
        const prefill = prefillData.currentSession.user?.admin?.user;
        if (prefill) {
            const nextCustomer: CustomerOption = {
                userId: prefill.userId,
                firstName: prefill.firstName,
                lastName: prefill.lastName,
                emailAddress: prefill.emailAddress,
            };
            form.setFieldValue('customer', nextCustomer);
            setCustomerSearchText(customerLabel(nextCustomer));
        }
        setPrefillApplied(true);
    }, [form, prefillApplied, prefillData, search.userId]);

    const [{ data: customersData, fetching: customersFetching }] = useQuery({
        query: AdminBookingRequestCreateCustomerSearchDocument,
        variables: {
            criterion: {
                skip: 0,
                take: 20,
                searchText: debouncedCustomerSearch.trim() || undefined,
                types: ['customer', 'cook', 'admin'],
            },
        },
        pause: debouncedCustomerSearch.trim().length < 2 || (customer != null && customerSearchText === customerLabel(customer)),
    });
    const customers = customersData?.currentSession.user?.admin?.users ?? [];

    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: AdminBookingRequestCreateLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || exactEventAddress?.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    const [{ data: cooksData, fetching: cooksFetching }] = useQuery({
        query: AdminBookingRequestCreateCooksInTravelRadiusDocument,
        variables: {
            latitude: exactEventAddress?.latitude ?? 0,
            longitude: exactEventAddress?.longitude ?? 0,
            excludeUserId: customer?.userId ?? null,
        },
        pause: !exactEventAddress,
    });
    const cooksInRadius = cooksData?.currentSession.user?.admin?.cooksInTravelRadius ?? EMPTY_COOKS_IN_RADIUS;
    cooksInRadiusCountRef.current = cooksInRadius.length;
    const cookIdsInRadius = useMemo(() => cooksInRadius.map((row) => row.cook.cookId), [cooksInRadius]);
    const cookIdsKey = cookIdsInRadius.join(',');

    useEffect(() => {
        const next = !venueKey || isLargeGroup ? [] : cookIdsKey.length > 0 ? cookIdsKey.split(',') : [];
        setSelectedCookIds((current) =>
            current.length === next.length && current.every((id, index) => id === next[index]) ? current : next,
        );
        setCookSelectionError(null);
    }, [venueKey, isLargeGroup, cookIdsKey]);

    const selectedCooks = useMemo(
        () => cooksInRadius.filter((row) => selectedCookIds.includes(row.cook.cookId)),
        [cooksInRadius, selectedCookIds],
    );
    const selectedSet = useMemo(() => new Set(selectedCookIds), [selectedCookIds]);
    const allSelected = cooksInRadius.length > 0 && selectedCookIds.length === cooksInRadius.length;
    const largeGroupNeedsCook = isLargeGroup && cooksInRadius.length > 0 && selectedCookIds.length === 0;

    function toggleCook(cookId: string, checked: boolean) {
        setCookSelectionError(null);
        if (checked) {
            setSelectedCookIds((current) => [...current, cookId]);
            return;
        }
        setSelectedCookIds((current) => current.filter((id) => id !== cookId));
    }

    async function onConfirmCreate() {
        const value = form.state.values;
        if (busy || !value.customer || !value.dateTime || !value.exactEventAddress) return;
        if (largeGroupNeedsCook) return;

        setBusy(true);
        setError(false);
        try {
            const result = await createBooking({
                input: {
                    userId: value.customer.userId,
                    occasion: value.occasion.trim(),
                    dateTime: value.dateTime.toISOString(),
                    exactEventAddress: value.exactEventAddress,
                    originalMessage: value.originalMessage.trim(),
                    preferences: [],
                    participants,
                    cookIds: selectedCookIds,
                },
            });
            const referenceId = result.data?.admin.bookingRequestCreate.referenceId;
            if (result.error || !result.data?.admin.bookingRequestCreate.success || !referenceId) {
                setError(true);
                setConfirmOpen(false);
                return;
            }
            setConfirmOpen(false);
            await navigate({
                to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                params: { bookingRequestId: referenceId },
            });
        } catch {
            setError(true);
            setConfirmOpen(false);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminPathPageChrome contentClassName="min-h-0 overflow-hidden gap-0">
            <AdminPinnedFooterLayout
                contentClassName="grid w-full content-start gap-8"
                footer={
                    <>
                        <Button type="button" variant="outline" disabled={busy} asChild>
                            <Link to="/{-$locale}/admin/booking-requests">{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</Link>
                        </Button>
                        <Button type="submit" form={CREATE_FORM_ID} disabled={busy}>
                            {{ de: 'Weiter zur Bestätigung', en: 'Continue to confirmation' }[locale]}
                        </Button>
                    </>
                }
            >
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminBookingRequestCreatePageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{adminBookingRequestCreatePageDescription[locale]}</p>
                </div>

                <form
                    id={CREATE_FORM_ID}
                    className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <div className="grid gap-5">
                        <form.Field
                            name="customer"
                            validators={{
                                onChange: ({ value }) =>
                                    value ? undefined : { de: 'Bitte einen Kunden auswählen.', en: 'Please choose a customer.' }[locale],
                                onSubmit: ({ value }) =>
                                    value ? undefined : { de: 'Bitte einen Kunden auswählen.', en: 'Please choose a customer.' }[locale],
                            }}
                        >
                            {(field) => {
                                const errorMessage = fieldErrorText(field.state.meta.errors);
                                const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                                const errorId = `${field.name}-error`;
                                return (
                                    <div className="grid gap-2">
                                        <span className="text-sm font-medium">{{ de: 'Kunde', en: 'Customer' }[locale]}</span>
                                        <Combobox
                                            items={customers.map((entry) => entry.userId)}
                                            value={field.state.value?.userId ?? null}
                                            inputValue={customerSearchText}
                                            onValueChange={(next) => {
                                                if (next == null) return;
                                                const match = customers.find((entry) => entry.userId === next);
                                                if (!match) return;
                                                field.handleChange(match);
                                                setCustomerSearchText(customerLabel(match));
                                            }}
                                            onInputValueChange={(next) => {
                                                setCustomerSearchText(next);
                                                if (field.state.value && next !== customerLabel(field.state.value)) {
                                                    field.handleChange(null);
                                                }
                                            }}
                                            itemToStringLabel={(userId: string) => {
                                                const match = customers.find((entry) => entry.userId === userId);
                                                return match ? customerLabel(match) : userId;
                                            }}
                                        >
                                            <ComboboxInput
                                                className="w-full"
                                                placeholder={{ de: 'Name oder E-Mail suchen…', en: 'Search name or email…' }[locale]}
                                                showClear={false}
                                                disabled={busy}
                                                aria-invalid={showError || undefined}
                                                aria-describedby={showError ? errorId : undefined}
                                            />
                                            <ComboboxContent>
                                                <ComboboxEmpty>
                                                    {customersFetching
                                                        ? { de: 'Suche…', en: 'Searching…' }[locale]
                                                        : { de: 'Keine Treffer.', en: 'No matches.' }[locale]}
                                                </ComboboxEmpty>
                                                <ComboboxList>
                                                    {(userId: string) => {
                                                        const match = customers.find((entry) => entry.userId === userId);
                                                        return (
                                                            <ComboboxItem key={userId} value={userId}>
                                                                {match ? customerLabel(match) : userId}
                                                            </ComboboxItem>
                                                        );
                                                    }}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                        {showError ? (
                                            <p id={errorId} className="text-sm text-destructive" role="alert">
                                                {errorMessage}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            }}
                        </form.Field>

                        <form.Field
                            name="occasion"
                            validators={{
                                onChange: ({ value }) =>
                                    requiredTrimmed(value, locale, {
                                        de: 'Anlass ist erforderlich.',
                                        en: 'Occasion is required.',
                                    }),
                                onBlur: ({ value }) =>
                                    requiredTrimmed(value, locale, {
                                        de: 'Anlass ist erforderlich.',
                                        en: 'Occasion is required.',
                                    }),
                                onSubmit: ({ value }) =>
                                    requiredTrimmed(value, locale, {
                                        de: 'Anlass ist erforderlich.',
                                        en: 'Occasion is required.',
                                    }),
                            }}
                        >
                            {(field) => {
                                const errorMessage = fieldErrorText(field.state.meta.errors);
                                const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                                const errorId = `${field.name}-error`;
                                return (
                                    <div className="grid gap-2">
                                        <label htmlFor="admin-booking-occasion" className="text-sm font-medium">
                                            {{ de: 'Anlass', en: 'Occasion' }[locale]}
                                        </label>
                                        <Input
                                            id="admin-booking-occasion"
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            disabled={busy}
                                            aria-invalid={showError || undefined}
                                            aria-describedby={showError ? errorId : undefined}
                                        />
                                        {showError ? (
                                            <p id={errorId} className="text-sm text-destructive" role="alert">
                                                {errorMessage}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            }}
                        </form.Field>

                        <form.Field
                            name="dateTime"
                            validators={{
                                onChange: ({ value }) =>
                                    value
                                        ? undefined
                                        : {
                                              de: 'Bitte Datum und Uhrzeit auswählen.',
                                              en: 'Please choose a date and time.',
                                          }[locale],
                                onSubmit: ({ value }) =>
                                    value
                                        ? undefined
                                        : {
                                              de: 'Bitte Datum und Uhrzeit auswählen.',
                                              en: 'Please choose a date and time.',
                                          }[locale],
                            }}
                        >
                            {(field) => {
                                const errorMessage = fieldErrorText(field.state.meta.errors);
                                const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                                const errorId = `${field.name}-error`;
                                return (
                                    <div className="grid gap-2">
                                        <span id="admin-booking-datetime-label" className="text-sm font-medium">
                                            {{ de: 'Datum und Uhrzeit', en: 'Date and time' }[locale]}
                                        </span>
                                        <DateTimePicker
                                            value={field.state.value}
                                            onValueChange={(dateTime) => field.handleChange(dateTime)}
                                            placeholder={{ de: 'Datum und Uhrzeit wählen', en: 'Pick date and time' }[locale]}
                                            timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                            locale={DATE_FNS_LOCALE[locale]}
                                            className="w-full"
                                            aria-labelledby="admin-booking-datetime-label"
                                            aria-invalid={showError || undefined}
                                            disabled={busy || { before: new Date() }}
                                        />
                                        {showError ? (
                                            <p id={errorId} className="text-sm text-destructive" role="alert">
                                                {errorMessage}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            }}
                        </form.Field>

                        <form.Field
                            name="exactEventAddress"
                            validators={{
                                onChange: ({ value }) =>
                                    value
                                        ? undefined
                                        : {
                                              de: 'Bitte einen Veranstaltungsort auswählen.',
                                              en: 'Please choose an event location.',
                                          }[locale],
                                onSubmit: ({ value }) =>
                                    value
                                        ? undefined
                                        : {
                                              de: 'Bitte einen Veranstaltungsort auswählen.',
                                              en: 'Please choose an event location.',
                                          }[locale],
                            }}
                        >
                            {(field) => {
                                const errorMessage = fieldErrorText(field.state.meta.errors);
                                const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                                const errorId = `${field.name}-error`;
                                return (
                                    <div className="grid gap-2">
                                        <span className="text-sm font-medium">
                                            {{ de: 'Veranstaltungsort', en: 'Event location' }[locale]}
                                        </span>
                                        <Combobox
                                            filter={null}
                                            items={suggestions.map((suggestion) => suggestion.displayText)}
                                            value={field.state.value?.displayText ?? null}
                                            inputValue={locationSearchText}
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
                                                field.handleChange(address);
                                                setLocationSearchText(match.displayText);
                                            }}
                                            onInputValueChange={(next) => {
                                                setLocationSearchText(next);
                                                if (field.state.value && next !== field.state.value.displayText) {
                                                    field.handleChange(null);
                                                }
                                            }}
                                            itemToStringLabel={(item: string) => item}
                                        >
                                            <ComboboxInput
                                                className="w-full"
                                                placeholder={{ de: 'Adresse suchen…', en: 'Search address…' }[locale]}
                                                showClear={false}
                                                disabled={busy}
                                                aria-invalid={showError || undefined}
                                                aria-describedby={showError ? errorId : undefined}
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
                                        {showError ? (
                                            <p id={errorId} className="text-sm text-destructive" role="alert">
                                                {errorMessage}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            }}
                        </form.Field>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <form.Field
                                name="adultCount"
                                validators={{
                                    onChange: ({ value }) =>
                                        value >= 1
                                            ? undefined
                                            : {
                                                  de: 'Mindestens ein Erwachsener ist erforderlich.',
                                                  en: 'At least one adult is required.',
                                              }[locale],
                                    onSubmit: ({ value }) =>
                                        value >= 1
                                            ? undefined
                                            : {
                                                  de: 'Mindestens ein Erwachsener ist erforderlich.',
                                                  en: 'At least one adult is required.',
                                              }[locale],
                                }}
                            >
                                {(field) => {
                                    const errorMessage = fieldErrorText(field.state.meta.errors);
                                    const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                                    return (
                                        <ParticipantCountField
                                            label={{ de: 'Erwachsene', en: 'Adults' }[locale]}
                                            value={field.state.value}
                                            min={1}
                                            disabled={busy}
                                            error={showError ? errorMessage : undefined}
                                            onChange={(next) => field.handleChange(next)}
                                        />
                                    );
                                }}
                            </form.Field>
                            <form.Field name="discountedCount">
                                {(field) => (
                                    <ParticipantCountField
                                        label={{ de: 'Kinder', en: 'Children' }[locale]}
                                        value={field.state.value}
                                        min={0}
                                        disabled={busy}
                                        onChange={(next) => field.handleChange(next)}
                                    />
                                )}
                            </form.Field>
                        </div>

                        {restrictionsEnabled ? (
                            <div className="grid gap-3">
                                <div className="grid gap-1">
                                    <span className="text-sm font-medium">{{ de: 'Einschränkungen', en: 'Restrictions' }[locale]}</span>
                                    <p className="text-sm text-muted-foreground">
                                        {
                                            {
                                                de: 'Wähle die zutreffenden Einschränkungen pro Gast.',
                                                en: 'Select the applicable restrictions per guest.',
                                            }[locale]
                                        }
                                    </p>
                                </div>
                                <BookingRequestParticipantsRestrictionsEditor
                                    participants={participants}
                                    onChange={setParticipants}
                                    disabled={busy}
                                />
                            </div>
                        ) : null}

                        <form.Field
                            name="originalMessage"
                            validators={{
                                onChange: ({ value }) =>
                                    requiredTrimmed(value, locale, {
                                        de: 'Nachricht ist erforderlich.',
                                        en: 'Message is required.',
                                    }),
                                onBlur: ({ value }) =>
                                    requiredTrimmed(value, locale, {
                                        de: 'Nachricht ist erforderlich.',
                                        en: 'Message is required.',
                                    }),
                                onSubmit: ({ value }) =>
                                    requiredTrimmed(value, locale, {
                                        de: 'Nachricht ist erforderlich.',
                                        en: 'Message is required.',
                                    }),
                            }}
                        >
                            {(field) => {
                                const errorMessage = fieldErrorText(field.state.meta.errors);
                                const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                                const errorId = `${field.name}-error`;
                                return (
                                    <div className="grid gap-2">
                                        <label htmlFor="admin-booking-message" className="text-sm font-medium">
                                            {{ de: 'Nachricht an die Köche', en: 'Message for the chefs' }[locale]}
                                        </label>
                                        <Textarea
                                            id="admin-booking-message"
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            disabled={busy}
                                            aria-invalid={showError || undefined}
                                            aria-describedby={showError ? errorId : undefined}
                                        />
                                        {showError ? (
                                            <p id={errorId} className="text-sm text-destructive" role="alert">
                                                {errorMessage}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            }}
                        </form.Field>

                        {error ? (
                            <p className="text-sm text-destructive" role="alert">
                                {
                                    {
                                        de: 'Die Anfrage konnte nicht angelegt werden.',
                                        en: 'Could not create the booking request.',
                                    }[locale]
                                }
                            </p>
                        ) : null}
                    </div>

                    <aside className="grid gap-4 lg:sticky lg:top-6">
                        {isLargeGroup ? (
                            <StatusAlert tone="warning" title={{ de: 'Großgruppe · Cashcow', en: 'Large group · Cash cow' }[locale]}>
                                {
                                    {
                                        de: 'Ab 12 Teilnehmern wird die Anfrage beim Anlegen als admin-freigegeben. Wähle die Köche, die benachrichtigt werden und die Anfrage sehen dürfen. Slack landet im Cashcow-Kanal.',
                                        en: 'From 12 participants the request is admin-approved on create. Choose which chefs are notified and can see it. Slack posts to the cash-cows channel.',
                                    }[locale]
                                }
                            </StatusAlert>
                        ) : (
                            <StatusAlert tone="info" title={{ de: 'Auto-freigegeben', en: 'Auto-approved' }[locale]}>
                                {
                                    {
                                        de: 'Kleine Gruppen werden automatisch freigegeben. Alle Köche im Anfahrtsradius sind vorausgewählt. Du kannst einzelne abwählen.',
                                        en: 'Small groups are auto-approved. All chefs in travel radius are preselected. You can deselect individuals.',
                                    }[locale]
                                }
                            </StatusAlert>
                        )}

                        <div className="grid gap-3 rounded-md border border-border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-sm font-medium">{{ de: 'Köche benachrichtigen', en: 'Notify chefs' }[locale]}</h2>
                                <Badge variant="secondary">
                                    {
                                        {
                                            de: `${selectedCookIds.length} ausgewählt`,
                                            en: `${selectedCookIds.length} selected`,
                                        }[locale]
                                    }
                                </Badge>
                            </div>

                            {!exactEventAddress ? (
                                <p className="text-sm text-muted-foreground">
                                    {
                                        {
                                            de: 'Zuerst einen Veranstaltungsort wählen, um Köche im Anfahrtsradius zu sehen.',
                                            en: 'Choose an event location first to see chefs in travel radius.',
                                        }[locale]
                                    }
                                </p>
                            ) : cooksFetching ? (
                                <p className="text-sm text-muted-foreground">
                                    {{ de: 'Köche werden geladen…', en: 'Loading chefs…' }[locale]}
                                </p>
                            ) : cooksInRadius.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {
                                        {
                                            de: 'Keine Köche im Anfahrtsradius. Die Anfrage wird ohne Benachrichtigung angelegt.',
                                            en: 'No chefs in travel radius. The request will be created without notifying anyone.',
                                        }[locale]
                                    }
                                </p>
                            ) : (
                                <div className="grid gap-3">
                                    {largeGroupNeedsCook || cookSelectionError ? (
                                        <p
                                            className={
                                                cookSelectionError != null || submissionAttempts > 0
                                                    ? 'text-sm text-destructive'
                                                    : 'text-sm text-accent'
                                            }
                                            role={cookSelectionError != null || submissionAttempts > 0 ? 'alert' : 'status'}
                                        >
                                            {cookSelectionError ??
                                                {
                                                    de: 'Mindestens einen Koch auswählen, damit die Anfrage sichtbar wird.',
                                                    en: 'Select at least one chef so the request becomes visible.',
                                                }[locale]}
                                        </p>
                                    ) : null}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={busy || allSelected}
                                            onClick={() => {
                                                setCookSelectionError(null);
                                                setSelectedCookIds(cookIdsInRadius);
                                            }}
                                        >
                                            {{ de: 'Alle auswählen', en: 'Select all' }[locale]}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={busy || selectedCookIds.length === 0}
                                            onClick={() => setSelectedCookIds([])}
                                        >
                                            {{ de: 'Keine', en: 'Clear' }[locale]}
                                        </Button>
                                    </div>
                                    <ul className="divide-y divide-border rounded-md border border-border">
                                        {cooksInRadius.map((row) => (
                                            <CookPickerRow
                                                key={row.cook.cookId}
                                                row={row}
                                                checked={selectedSet.has(row.cook.cookId)}
                                                disabled={busy}
                                                locale={locale}
                                                onToggle={toggleCook}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </aside>
                </form>

                <AdminBookingRequestCreateConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    busy={busy}
                    locale={locale}
                    timeZone={timeZone}
                    values={values}
                    isLargeGroup={isLargeGroup}
                    selectedCooks={selectedCooks}
                    confirmDisabled={largeGroupNeedsCook}
                    onConfirm={onConfirmCreate}
                />
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}

function CookPickerRow({
    row,
    checked,
    disabled,
    locale,
    onToggle,
}: {
    row: CookInRadiusPreview;
    checked: boolean;
    disabled: boolean;
    locale: Locale;
    onToggle: (cookId: string, checked: boolean) => void;
}) {
    const cookId = row.cook.cookId;
    const city = row.cook.exactTravelOriginAddress?.city;
    return (
        <li className="flex items-start gap-3 px-3 py-2.5">
            <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => onToggle(cookId, value === true)}
                aria-label={userDisplayName(row.cook.user)}
                className="mt-0.5"
            />
            <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-medium">{userDisplayName(row.cook.user)}</span>
                <p className="text-xs text-muted-foreground">
                    {[city, row.cook.cuisineStyle, `${formatTravelDistanceKm(row.estimatedTravelDistanceKm, locale)} km`]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
                <p className="truncate text-xs text-muted-foreground">{row.cook.user.emailAddress}</p>
            </div>
        </li>
    );
}

function AdminBookingRequestCreateConfirmDialog({
    open,
    onOpenChange,
    busy,
    locale,
    timeZone,
    values,
    isLargeGroup,
    selectedCooks,
    confirmDisabled,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    busy: boolean;
    locale: Locale;
    timeZone: string;
    values: FormValues;
    isLargeGroup: boolean;
    selectedCooks: CookInRadiusPreview[];
    confirmDisabled: boolean;
    onConfirm: () => void;
}) {
    const participantsLabel = formatParticipants(
        {
            adultCount: values.adultCount,
            discountedCount: values.discountedCount,
        },
        { locale },
    );
    const publicationLabel = isLargeGroup
        ? { de: 'Admin-freigegeben', en: 'Admin-approved' }[locale]
        : { de: 'Auto-freigegeben', en: 'Auto-approved' }[locale];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{{ de: 'Anfrage anlegen?', en: 'Create booking request?' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Prüfe die Zusammenfassung. Beim Bestätigen wird die Anfrage angelegt und die ausgewählten Köche benachrichtigt.',
                                en: 'Review the summary. Confirming creates the request and notifies the selected chefs.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>

                <dl className="grid gap-3 text-sm">
                    <ConfirmRow
                        label={{ de: 'Kunde', en: 'Customer' }[locale]}
                        value={values.customer ? customerLabel(values.customer) : '—'}
                    />
                    <ConfirmRow label={{ de: 'Anlass', en: 'Occasion' }[locale]} value={values.occasion.trim() || '—'} />
                    <ConfirmRow
                        label={{ de: 'Datum', en: 'Date' }[locale]}
                        value={
                            values.dateTime ? formatDateTime(values.dateTime.toISOString(), { locale, timeZone, dateStyle: 'full' }) : '—'
                        }
                    />
                    <ConfirmRow label={{ de: 'Ort', en: 'Location' }[locale]} value={values.exactEventAddress?.displayText ?? '—'} />
                    <ConfirmRow label={{ de: 'Teilnehmer', en: 'Participants' }[locale]} value={participantsLabel} />
                    <ConfirmRow
                        label={{ de: 'Veröffentlichung', en: 'Publication' }[locale]}
                        value={
                            isLargeGroup
                                ? `${publicationLabel} · ${{ de: 'Großgruppe / Cashcow', en: 'Large group / cash cow' }[locale]}`
                                : publicationLabel
                        }
                    />
                    <div className="grid gap-1">
                        <dt className="text-muted-foreground">
                            {
                                {
                                    de: `Benachrichtigung (${selectedCooks.length})`,
                                    en: `Notify (${selectedCooks.length})`,
                                }[locale]
                            }
                        </dt>
                        <dd>
                            {selectedCooks.length === 0 ? (
                                <span className="text-muted-foreground">{{ de: 'Keine Köche', en: 'No chefs' }[locale]}</span>
                            ) : (
                                <ul className="list-inside list-disc">
                                    {selectedCooks.map((row) => (
                                        <li key={row.cook.cookId}>{userDisplayName(row.cook.user)}</li>
                                    ))}
                                </ul>
                            )}
                        </dd>
                    </div>
                </dl>

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="button" disabled={busy || confirmDisabled} onClick={onConfirm}>
                        {busy ? { de: 'Anlegen…', en: 'Creating…' }[locale] : { de: 'Anfrage anlegen', en: 'Create request' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{value}</dd>
        </div>
    );
}

function ParticipantCountField({
    label,
    value,
    min,
    disabled,
    error,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    disabled: boolean;
    error?: string;
    onChange: (next: number) => void;
}) {
    return (
        <div className="grid gap-2">
            <span className="text-sm font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={disabled || value <= min}
                    aria-label={`− ${label}`}
                    onClick={() => onChange(Math.max(min, value - 1))}
                >
                    <MinusIcon className="size-4" />
                </Button>
                <Input
                    type="number"
                    min={min}
                    value={value}
                    disabled={disabled}
                    className="text-center"
                    aria-label={label}
                    aria-invalid={error != null || undefined}
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
                    disabled={disabled}
                    aria-label={`+ ${label}`}
                    onClick={() => onChange(value + 1)}
                >
                    <PlusIcon className="size-4" />
                </Button>
            </div>
            {error != null ? (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
