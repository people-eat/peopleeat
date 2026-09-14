import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { bookingRequestParticipantsFromCounts, formatCurrency } from '../../../shared';
import type { BookingRequestParticipantDraft } from '../../../shared';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestParticipantsRestrictionsEditor } from '../../components/BookingRequestParticipantsRestrictionsEditor';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type {
    GqlCLocationSuggestion,
    GqlCProfileCustomerBookingRequestPageQuery,
    GqlCProfileCustomerBookingRequestPageUserFragment,
    GqlCUserBookingRequestExactEventAddressInput,
    GqlCUserBookingRequestOfferTravelImpact,
} from '../../graphql/generated';
import {
    ProfileBookingRequestUpdateDocument,
    ProfileCustomerBookingRequestEditLocationSuggestionsDocument,
    ProfileCustomerBookingRequestEditTravelImpactDocument,
    ProfileCustomerBookingRequestPageUpdatesDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';

const UPDATABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW']);

export const profileCustomerBookingRequestEditPageTitle = {
    de: 'Anfrage bearbeiten',
    en: 'Edit request',
} as const;
export const profileCustomerBookingRequestEditPageDescription = {
    de: 'Anlass, Termin, Ort, Teilnehmer, Präferenzen und Einschränkungen bearbeiten.',
    en: 'Edit occasion, date, location, participants, preferences, and restrictions.',
} as const;

export function profileCustomerBookingRequestEditPageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

type BookingRequestFormValues = {
    occasion: string;
    dateTime: string;
    adultCount: number;
    childCount: number;
    preferences: string;
    exactEventAddress: GqlCUserBookingRequestExactEventAddressInput;
};

function addressFromRequest(
    address: NonNullable<GqlCProfileCustomerBookingRequestPageUserFragment['bookingRequest']>['exactEventAddress'],
): GqlCUserBookingRequestExactEventAddressInput {
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

function formFromRequest(
    request: NonNullable<GqlCProfileCustomerBookingRequestPageUserFragment['bookingRequest']>,
): BookingRequestFormValues {
    return {
        occasion: request.occasion,
        dateTime: request.dateTime,
        adultCount: request.participants.filter((participant) => participant.type === 'ADULT').length || 1,
        childCount: request.participants.filter((participant) => participant.type === 'DISCOUNTED').length,
        preferences: request.preferences.join(', '),
        exactEventAddress: addressFromRequest(request.exactEventAddress),
    };
}

function bookingRequestCanUpdate(request: NonNullable<GqlCProfileCustomerBookingRequestPageUserFragment['bookingRequest']>): boolean {
    return UPDATABLE_STATUSES.has(request.status) && !request.canceledAt;
}

function exactEventAddressEqual(a: GqlCUserBookingRequestExactEventAddressInput, b: GqlCUserBookingRequestExactEventAddressInput): boolean {
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

function signedKmLabel(deltaKm: number, locale: Locale): string {
    const rounded = Math.round(deltaKm * 10) / 10;
    const abs = Math.abs(rounded).toFixed(1);
    if (rounded > 0) return `+${abs} km`;
    if (rounded < 0) return `−${abs} km`;
    return { de: '±0 km', en: '±0 km' }[locale];
}

function signedTravelExpenseLabel(deltaCents: number, locale: Locale): string {
    const abs = formatCurrency(Math.abs(deltaCents), { locale, maximumFractionDigits: 0 });
    if (deltaCents > 0) return `+${abs}`;
    if (deltaCents < 0) return `−${abs}`;
    return { de: '±0 €', en: '±€0' }[locale];
}

function travelImpactMeaningful(impact: GqlCUserBookingRequestOfferTravelImpact): boolean {
    const distanceDelta = impact.travelDistanceKmAfter - impact.travelDistanceKmBefore;
    const expenseDelta = impact.travelExpensesCentsAfter - impact.travelExpensesCentsBefore;
    return Math.abs(distanceDelta) >= 0.05 || expenseDelta !== 0;
}

function TravelImpactPreview({
    impacts,
    fetching,
    locale,
}: {
    impacts: GqlCUserBookingRequestOfferTravelImpact[];
    fetching: boolean;
    locale: Locale;
}) {
    if (fetching) {
        return <StatusAlert tone="info" title={{ de: 'Fahrtkosten werden berechnet…', en: 'Calculating travel costs…' }[locale]} />;
    }

    const changed = impacts.filter(travelImpactMeaningful);
    if (changed.length === 0) {
        return (
            <StatusAlert tone="info" title={{ de: 'Keine Änderung der Fahrtkosten', en: 'No change to travel costs' }[locale]}>
                {
                    {
                        de: 'Für die bestehenden Angebote bleibt die Fahrtstrecke gleich.',
                        en: 'Travel distance stays the same for existing offers.',
                    }[locale]
                }
            </StatusAlert>
        );
    }

    return (
        <StatusAlert tone="warning" title={{ de: 'Auswirkung auf Angebote', en: 'Impact on offers' }[locale]}>
            <ul className="mt-2 grid gap-1.5 text-sm">
                {changed.map((impact) => {
                    const distanceDelta = impact.travelDistanceKmAfter - impact.travelDistanceKmBefore;
                    const expenseDelta = impact.travelExpensesCentsAfter - impact.travelExpensesCentsBefore;
                    return (
                        <li key={impact.bookingRequestOfferId}>
                            <span className="font-medium">{impact.cookDisplay}</span>
                            {': '}
                            {signedKmLabel(distanceDelta, locale)}
                            {' · '}
                            {signedTravelExpenseLabel(expenseDelta, locale)} {{ de: 'Fahrtkosten', en: 'travel' }[locale]}
                        </li>
                    );
                })}
            </ul>
        </StatusAlert>
    );
}

export function ProfileCustomerBookingRequestEditPage({
    data,
    bookingRequestId,
}: {
    data: GqlCProfileCustomerBookingRequestPageQuery;
    bookingRequestId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const seedRequest = seedUser?.bookingRequest ?? null;
    if (!seedRequest) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCustomerBookingRequestPageUpdatesDocument, { bookingRequestId });
    const request = user?.bookingRequest ?? null;
    const canUpdate = request != null && bookingRequestCanUpdate(request);

    const [locationSearchText, setLocationSearchText] = useState(seedRequest.exactEventAddress.displayText);
    const [, updateRequest] = useMutation(ProfileBookingRequestUpdateDocument);
    const restrictionsEnabled = useFeatureToggleActive('BOOKING_REQUEST_RESTRICTIONS');
    const [participants, setParticipants] = useState<BookingRequestParticipantDraft[]>(() =>
        seedRequest.participants.map((participant) => ({
            type: participant.type,
            name: participant.name,
            restrictions: [...participant.restrictions],
        })),
    );

    const form = useForm({
        defaultValues: formFromRequest(seedRequest),
        onSubmit: async ({ value }) => {
            if (request == null || !bookingRequestCanUpdate(request)) return;
            if (!value.exactEventAddress.displayText.trim()) {
                toast.error(
                    {
                        de: 'Bitte eine vollständige Adresse wählen.',
                        en: 'Please choose a full address.',
                    }[locale],
                );
                return;
            }
            try {
                const nextParticipants = bookingRequestParticipantsFromCounts({
                    adultCount: Math.max(1, value.adultCount),
                    discountedCount: Math.max(0, value.childCount),
                    locale,
                    previous: participants,
                });
                const preferences = value.preferences
                    .split(',')
                    .map((preference) => preference.trim())
                    .filter((preference) => preference.length > 0);
                const result = await updateRequest({
                    bookingRequestId,
                    occasion: value.occasion.trim(),
                    dateTime: value.dateTime,
                    preferences,
                    participants: nextParticipants,
                    exactEventAddress: value.exactEventAddress,
                });
                if (!result.data?.user.bookingRequestUpdate.success) {
                    throw new Error('update failed');
                }
                toast.success({ de: 'Anfrage aktualisiert.', en: 'Request updated.' }[locale]);
                await navigate({
                    to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                    params: { bookingRequestId },
                });
            } catch {
                toast.error({ de: 'Aktualisierung fehlgeschlagen.', en: 'Update failed.' }[locale]);
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const occasion = useSelector(form.store, (state) => state.values.occasion);
    const exactEventAddress = useSelector(form.store, (state) => state.values.exactEventAddress);
    const adultCount = useSelector(form.store, (state) => state.values.adultCount);
    const childCount = useSelector(form.store, (state) => state.values.childCount);

    useEffect(() => {
        setParticipants((previous) =>
            bookingRequestParticipantsFromCounts({
                adultCount: Math.max(1, adultCount),
                discountedCount: Math.max(0, childCount),
                locale,
                previous,
            }),
        );
    }, [adultCount, childCount, locale]);

    const debouncedLocationSearch = useDebouncedValue(locationSearchText, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: ProfileCustomerBookingRequestEditLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || exactEventAddress.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    const seedAddress = addressFromRequest(seedRequest.exactEventAddress);
    const locationChanged = exactEventAddress.displayText.trim().length > 0 && !exactEventAddressEqual(exactEventAddress, seedAddress);
    const hasOffers = (request?.offers.length ?? 0) > 0;
    const [{ data: travelImpactData, fetching: travelImpactFetching }] = useQuery({
        query: ProfileCustomerBookingRequestEditTravelImpactDocument,
        variables: { bookingRequestId, exactEventAddress },
        pause: !locationChanged || !hasOffers,
    });
    const travelImpacts = travelImpactData?.currentSession.user?.bookingRequest?.travelImpact ?? [];

    useEffect(() => {
        if (user == null) return;
        if (request == null || !bookingRequestCanUpdate(request)) {
            void navigate({
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                params: { bookingRequestId },
                replace: true,
            });
            return;
        }
        if (!isDirty) {
            form.reset(formFromRequest(request));
            setLocationSearchText(request.exactEventAddress.displayText);
            setParticipants(
                request.participants.map((participant) => ({
                    type: participant.type,
                    name: participant.name,
                    restrictions: [...participant.restrictions],
                })),
            );
        }
    }, [bookingRequestId, form, isDirty, navigate, request, user]);

    if (request == null || !canUpdate) {
        return null;
    }

    return (
        <ProfilePinnedFooterLayout
            contentClassName="grid max-w-xl content-start gap-8"
            footer={
                <>
                    <Button type="button" variant="outline" disabled={isSubmitting} asChild>
                        <Link to="/{-$locale}/profile/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                        </Link>
                    </Button>
                    <Button
                        type="submit"
                        form="booking-request-edit-form"
                        disabled={isSubmitting || occasion.trim().length === 0 || exactEventAddress.displayText.trim().length === 0}
                    >
                        {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </>
            }
        >
            <StatusAlert
                tone="warning"
                title={
                    {
                        de: 'Wesentliche Änderungen müssen vom Koch erneut bestätigt werden.',
                        en: 'Material changes require the chef to confirm again.',
                    }[locale]
                }
            />

            <form
                id="booking-request-edit-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <form.Field name="occasion">
                    {(field) => (
                        <div className="grid gap-1.5">
                            <label htmlFor="booking-request-occasion" className="text-sm font-medium">
                                {{ de: 'Anlass', en: 'Occasion' }[locale]}
                            </label>
                            <Input
                                id="booking-request-occasion"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder={{ de: 'Anlass', en: 'Occasion' }[locale]}
                            />
                        </div>
                    )}
                </form.Field>
                <form.Field name="dateTime">
                    {(field) => (
                        <div className="grid gap-1.5">
                            <span className="text-sm font-medium">{{ de: 'Datum & Uhrzeit', en: 'Date & time' }[locale]}</span>
                            <DateTimePicker
                                value={new Date(field.state.value)}
                                onValueChange={(date) => field.handleChange(date.toISOString())}
                                placeholder={{ de: 'Datum & Uhrzeit', en: 'Date & time' }[locale]}
                                timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                locale={DATE_FNS_LOCALE[locale]}
                                className="w-full"
                            />
                        </div>
                    )}
                </form.Field>
                <form.Field name="exactEventAddress">
                    {(field) => (
                        <div className="grid gap-1.5">
                            <span className="text-sm font-medium">{{ de: 'Veranstaltungsort', en: 'Event location' }[locale]}</span>
                            <Combobox
                                filter={null}
                                items={suggestions.map((suggestion) => suggestion.displayText)}
                                value={field.state.value.displayText || null}
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
                                    if (field.state.value.displayText && next !== field.state.value.displayText) {
                                        field.handleChange({
                                            ...field.state.value,
                                            displayText: '',
                                        });
                                    }
                                }}
                                itemToStringLabel={(item: string) => item}
                            >
                                <ComboboxInput
                                    className="w-full"
                                    placeholder={{ de: 'Adresse suchen…', en: 'Search address…' }[locale]}
                                    showClear={false}
                                    disabled={isSubmitting}
                                    required={!field.state.value.displayText}
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
                            {locationChanged && hasOffers ? (
                                <TravelImpactPreview impacts={travelImpacts} fetching={travelImpactFetching} locale={locale} />
                            ) : null}
                        </div>
                    )}
                </form.Field>
                <div className="grid grid-cols-2 gap-3">
                    <form.Field name="adultCount">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="booking-request-adults" className="text-sm font-medium">
                                    {{ de: 'Erwachsene', en: 'Adults' }[locale]}
                                </label>
                                <Input
                                    id="booking-request-adults"
                                    name={field.name}
                                    type="number"
                                    min={1}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(Number(event.target.value) || 1)}
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="childCount">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="booking-request-children" className="text-sm font-medium">
                                    {{ de: 'Kinder', en: 'Children' }[locale]}
                                </label>
                                <Input
                                    id="booking-request-children"
                                    name={field.name}
                                    type="number"
                                    min={0}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(Number(event.target.value) || 0)}
                                />
                            </div>
                        )}
                    </form.Field>
                </div>
                <form.Field name="preferences">
                    {(field) => (
                        <div className="grid gap-1.5">
                            <label htmlFor="booking-request-preferences" className="text-sm font-medium">
                                {{ de: 'Präferenzen', en: 'Preferences' }[locale]}
                            </label>
                            <Textarea
                                id="booking-request-preferences"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder={{ de: 'Präferenzen, durch Komma getrennt', en: 'Preferences (comma-separated)' }[locale]}
                                rows={3}
                            />
                        </div>
                    )}
                </form.Field>

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
                            disabled={isSubmitting}
                        />
                    </div>
                ) : null}
            </form>
        </ProfilePinnedFooterLayout>
    );
}
