import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { CakeIcon, GemIcon, HeartHandshakeIcon, HeartIcon, UsersIcon, UsersRoundIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import {
    bookingRequestParticipantsFromCounts,
    defaultBookingRequestOccasions,
    defaultBookingRequestPreferences,
    textNormalizeTitled,
} from '../../../shared';
import type { BookingRequestParticipantDraft } from '../../../shared';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { StatusAlert } from '../../components/base/status-alert';
import {
    BookingRequestOfferPriceImpactPreview,
    BookingRequestOfferTravelImpactPreview,
} from '../../components/BookingRequestOfferImpactPreviews';
import { BookingRequestParticipantsRestrictionsEditor } from '../../components/BookingRequestParticipantsRestrictionsEditor';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import { SelectableChip } from '../../components/SelectableChip';
import type {
    GqlCLocationSuggestion,
    GqlCProfileCustomerBookingRequestPageQuery,
    GqlCProfileCustomerBookingRequestPageUserFragment,
    GqlCUserBookingRequestExactEventAddressInput,
} from '../../graphql/generated';
import {
    ProfileBookingRequestUpdateDocument,
    ProfileCustomerBookingRequestEditLocationSuggestionsDocument,
    ProfileCustomerBookingRequestEditPriceImpactDocument,
    ProfileCustomerBookingRequestEditTravelImpactDocument,
    ProfileCustomerBookingRequestPageUpdatesDocument,
    ProfileCustomerBookingRequestParticipantAmendmentCreateDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';

const UPDATABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW']);

const occasionIcons = [
    <CakeIcon className="size-4" key="cake-1" />,
    <CakeIcon className="size-4" key="cake-2" />,
    <HeartIcon className="size-4" key="heart" />,
    <GemIcon className="size-4" key="gem" />,
    <UsersRoundIcon className="size-4" key="users-round" />,
    <HeartHandshakeIcon className="size-4" key="handshake" />,
    <UsersIcon className="size-4" key="users" />,
];

export const profileCustomerBookingRequestEditPageTitle = {
    de: 'Anfrage bearbeiten',
    en: 'Edit request',
} as const;
export const profileCustomerBookingRequestEditPageDescription = {
    de: 'Anlass, Termin, Ort, Teilnehmer, Präferenzen und Einschränkungen bearbeiten. Nach Annahme nur noch Teilnehmerzahl und Ort.',
    en: 'Edit occasion, date, location, participants, preferences, and restrictions. After accept, only guest count and venue.',
} as const;

export function profileCustomerBookingRequestEditPageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

type BookingRequestFormValues = {
    occasion: string;
    dateTime: string;
    adultCount: number;
    childCount: number;
    preferences: string[];
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
        preferences: [...request.preferences],
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
    const participantAmendmentEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT');
    const canUpdate = request != null && bookingRequestCanUpdate(request);
    const amendableOffer =
        request?.offers.find((offer) => offer.canRequestParticipantAmendment) ??
        seedRequest.offers.find((offer) => offer.canRequestParticipantAmendment) ??
        null;
    const pendingAmendmentOffer =
        request?.offers.find((offer) => offer.participantAmendment != null) ??
        seedRequest.offers.find((offer) => offer.participantAmendment != null) ??
        null;
    const isParticipantAmendmentMode =
        !canUpdate && participantAmendmentEnabled && (amendableOffer != null || pendingAmendmentOffer != null);
    const canStayOnEdit = canUpdate || isParticipantAmendmentMode;

    const [locationSearchText, setLocationSearchText] = useState(seedRequest.exactEventAddress.displayText);
    const [customPreferenceText, setCustomPreferenceText] = useState('');
    const [, updateRequest] = useMutation(ProfileBookingRequestUpdateDocument);
    const [, createParticipantAmendment] = useMutation(ProfileCustomerBookingRequestParticipantAmendmentCreateDocument);
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
            if (request == null) return;

            const nextParticipants = bookingRequestParticipantsFromCounts({
                adultCount: Math.max(1, value.adultCount),
                discountedCount: Math.max(0, value.childCount),
                locale,
                previous: participants,
            });

            if (isParticipantAmendmentMode) {
                const offerId = amendableOffer?.bookingRequestOfferId;
                if (offerId == null || pendingAmendmentOffer != null) return;
                const locationChangedForAmendment =
                    value.exactEventAddress.displayText.trim().length > 0 &&
                    !exactEventAddressEqual(value.exactEventAddress, addressFromRequest(seedRequest.exactEventAddress));
                const headcountChangedForAmendment =
                    value.adultCount !== (seedRequest.participants.filter((p) => p.type === 'ADULT').length || 1) ||
                    value.childCount !== seedRequest.participants.filter((p) => p.type === 'DISCOUNTED').length;
                if (!locationChangedForAmendment && !headcountChangedForAmendment) {
                    toast.error(
                        {
                            de: 'Bitte Teilnehmerzahl oder Ort ändern.',
                            en: 'Please change the guest count or venue.',
                        }[locale],
                    );
                    return;
                }
                if (locationChangedForAmendment && !value.exactEventAddress.displayText.trim()) {
                    toast.error(
                        {
                            de: 'Bitte eine vollständige Adresse wählen.',
                            en: 'Please choose a full address.',
                        }[locale],
                    );
                    return;
                }
                try {
                    const result = await createParticipantAmendment({
                        bookingRequestOfferId: offerId,
                        ...(headcountChangedForAmendment
                            ? {
                                  participants: nextParticipants.map((participant) => ({
                                      type: participant.type,
                                      name: participant.name,
                                      restrictions: participant.restrictions,
                                  })),
                              }
                            : {}),
                        ...(locationChangedForAmendment ? { exactEventAddress: value.exactEventAddress } : {}),
                    });
                    if (result.error || !result.data?.user.bookingRequestOfferParticipantAmendmentCreate.success) {
                        throw new Error('amendment create failed');
                    }
                    toast.success(
                        {
                            de: 'Vorschlag an den Koch gesendet.',
                            en: 'Proposal sent to the chef.',
                        }[locale],
                    );
                    await navigate({
                        to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                        params: { bookingRequestId },
                    });
                } catch {
                    toast.error(
                        {
                            de: 'Die Buchungsänderung konnte nicht gesendet werden.',
                            en: 'Could not send the booking change.',
                        }[locale],
                    );
                }
                return;
            }

            if (!bookingRequestCanUpdate(request)) return;
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
                const preferences = value.preferences
                    .map((preference) => textNormalizeTitled(preference))
                    .filter((preference) => preference.length > 0)
                    .slice(0, 4);
                const result = await updateRequest({
                    bookingRequestId,
                    occasion: textNormalizeTitled(value.occasion),
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
    const preferences = useSelector(form.store, (state) => state.values.preferences);
    const exactEventAddress = useSelector(form.store, (state) => state.values.exactEventAddress);
    const adultCount = useSelector(form.store, (state) => state.values.adultCount);
    const childCount = useSelector(form.store, (state) => state.values.childCount);

    const defaultPreferences = defaultBookingRequestPreferences(locale);
    const preferenceOptionsCustom = preferences.filter((preference) => !defaultPreferences.includes(preference));
    const preferenceOptions = [...defaultPreferences, ...preferenceOptionsCustom].filter((option) =>
        option.toLowerCase().includes(customPreferenceText.toLowerCase()),
    );

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
    const seedAdultCount = seedRequest.participants.filter((participant) => participant.type === 'ADULT').length || 1;
    const seedChildCount = seedRequest.participants.filter((participant) => participant.type === 'DISCOUNTED').length;
    const headcountChanged = adultCount !== seedAdultCount || childCount !== seedChildCount;
    const hasOffers = (request?.offers.length ?? 0) > 0;
    const [{ data: travelImpactData, fetching: travelImpactFetching }] = useQuery({
        query: ProfileCustomerBookingRequestEditTravelImpactDocument,
        variables: { bookingRequestId, exactEventAddress },
        pause: !locationChanged || !hasOffers,
    });
    const travelImpacts = travelImpactData?.currentSession.user?.bookingRequest?.travelImpact ?? [];
    const [{ data: priceImpactData, fetching: priceImpactFetching }] = useQuery({
        query: ProfileCustomerBookingRequestEditPriceImpactDocument,
        variables: { bookingRequestId, participantsAdult: adultCount, participantsDiscounted: childCount },
        pause: !headcountChanged || !hasOffers,
    });
    const priceImpactsRaw = priceImpactData?.currentSession.user?.bookingRequest?.priceImpact ?? [];
    const amendmentOfferId = isParticipantAmendmentMode
        ? (amendableOffer?.bookingRequestOfferId ?? pendingAmendmentOffer?.bookingRequestOfferId)
        : null;
    const priceImpacts =
        amendmentOfferId != null ? priceImpactsRaw.filter((impact) => impact.bookingRequestOfferId === amendmentOfferId) : priceImpactsRaw;

    useEffect(() => {
        if (user == null) return;
        if (request == null || !canStayOnEdit) {
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
    }, [bookingRequestId, canStayOnEdit, form, isDirty, navigate, request, user]);

    if (request == null || !canStayOnEdit) {
        return null;
    }

    const pendingAmendment = pendingAmendmentOffer?.participantAmendment ?? null;
    const amendmentSubmitDisabled = isParticipantAmendmentMode && (pendingAmendment != null || amendableOffer == null || isSubmitting);
    const fullSubmitDisabled =
        !isParticipantAmendmentMode && (isSubmitting || occasion.trim().length === 0 || exactEventAddress.displayText.trim().length === 0);

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
                    {pendingAmendment == null ? (
                        <Button
                            type="submit"
                            form="booking-request-edit-form"
                            disabled={isParticipantAmendmentMode ? amendmentSubmitDisabled : fullSubmitDisabled}
                        >
                            {isSubmitting
                                ? { de: 'Senden…', en: 'Sending…' }[locale]
                                : isParticipantAmendmentMode
                                  ? { de: 'Vorschlag senden', en: 'Send proposal' }[locale]
                                  : { de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    ) : null}
                </>
            }
        >
            {isParticipantAmendmentMode ? (
                pendingAmendment != null ? (
                    <StatusAlert tone="info" title={{ de: 'Änderung vorgeschlagen', en: 'Change proposed' }[locale]}>
                        {
                            {
                                de: 'Dein Vorschlag wartet auf die Bestätigung des Kochs. Die aktuelle Buchung bleibt unverändert, bis er annimmt oder ablehnt.',
                                en: 'Your proposal is waiting for the chef to confirm. The current booking stays unchanged until they accept or decline.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : (
                    <StatusAlert
                        tone="warning"
                        title={{ de: 'Koch muss die Buchungsänderung bestätigen', en: 'Chef must confirm the booking change' }[locale]}
                    >
                        {
                            {
                                de: 'Nach der gemeinsamen Annahme ändern sich Preis und Zahlung erst, wenn der Koch zustimmt. Du kannst Teilnehmerzahl und Veranstaltungsort vorschlagen. Datum, Anlass und Präferenzen bleiben unverändert.',
                                en: 'After both sides accepted, price and payment change only when the chef agrees. You can propose a new guest count and venue. Date, occasion, and preferences stay unchanged.',
                            }[locale]
                        }
                    </StatusAlert>
                )
            ) : (
                <StatusAlert
                    tone="warning"
                    title={
                        {
                            de: 'Wesentliche Änderungen müssen vom Koch erneut bestätigt werden.',
                            en: 'Material changes require the chef to confirm again.',
                        }[locale]
                    }
                >
                    {
                        {
                            de: 'Ändern sich Teilnehmerzahl oder Adresse, kann der Angebotspreis automatisch angepasst werden. Der Koch bestätigt danach erneut.',
                            en: 'If the guest count or address changes, the offer price may adjust automatically. The chef confirms again afterwards.',
                        }[locale]
                    }
                </StatusAlert>
            )}

            <form
                id="booking-request-edit-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                {!isParticipantAmendmentMode ? (
                    <>
                        <form.Field name="occasion">
                            {(field) => (
                                <div className="grid gap-4">
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
                                            placeholder={
                                                {
                                                    de: 'z. B. Geburtstag, Firmenfeier',
                                                    en: 'e.g. Birthday, company dinner',
                                                }[locale]
                                            }
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {defaultBookingRequestOccasions(locale).map((option, index) => (
                                            <SelectableChip
                                                key={option}
                                                label={option}
                                                icon={occasionIcons[index]}
                                                selected={field.state.value === option}
                                                disabled={isSubmitting}
                                                onClick={() => field.handleChange(field.state.value === option ? '' : option)}
                                            />
                                        ))}
                                    </div>
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
                    </>
                ) : null}
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
                                    disabled={isSubmitting || pendingAmendment != null}
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
                            {locationChanged && (hasOffers || isParticipantAmendmentMode) ? (
                                <BookingRequestOfferTravelImpactPreview
                                    impacts={travelImpacts}
                                    fetching={travelImpactFetching}
                                    locale={locale}
                                />
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
                                    disabled={pendingAmendment != null}
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
                                    disabled={pendingAmendment != null}
                                />
                            </div>
                        )}
                    </form.Field>
                </div>
                {headcountChanged && hasOffers ? (
                    <BookingRequestOfferPriceImpactPreview impacts={priceImpacts} fetching={priceImpactFetching} locale={locale} />
                ) : null}
                {!isParticipantAmendmentMode ? (
                    <div className="grid gap-3">
                        <span className="text-sm font-medium">{{ de: 'Präferenzen', en: 'Preferences' }[locale]}</span>
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
                                disabled={isSubmitting || preferences.length >= 4}
                            />
                            <Button
                                type="button"
                                className="justify-self-end"
                                variant="default"
                                disabled={isSubmitting || customPreferenceText.trim() === '' || preferences.length >= 4}
                                onClick={() => {
                                    const next = textNormalizeTitled(customPreferenceText);
                                    if (!next) return;
                                    form.setFieldValue('preferences', [...preferences, next]);
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
                                                    disabled={isSubmitting || (!selected && field.state.value.length >= 4)}
                                                    onClick={() => {
                                                        if (selected) {
                                                            field.handleChange(field.state.value.filter((item) => item !== option));
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

                {restrictionsEnabled && pendingAmendment == null ? (
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
