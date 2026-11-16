import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { CakeIcon, GemIcon, HeartHandshakeIcon, HeartIcon, UsersIcon, UsersRoundIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { t } from '../../../i18n/t';
import {
    bookingRequestParticipantsFromCounts,
    bookingRequestSettingChoiceFromStored,
    bookingRequestSettingFromChoice,
    defaultBookingRequestOccasions,
    defaultBookingRequestPreferences,
    textNormalizeTitled,
} from '../../../shared';
import type { BookingRequestKitchenDetailsDraft, BookingRequestParticipantDraft, BookingRequestSettingChoice } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { StatusAlert } from '../../components/base/status-alert';
import {
    bookingRequestKitchenDetailsDraftFromGql,
    BookingRequestKitchenDetailsFields,
    bookingRequestKitchenDetailsInputFromDraft,
    bookingRequestKitchenDetailsPhotosFromGql,
} from '../../components/BookingRequestKitchenDetailsFields';
import type { BookingRequestKitchenDetailsPhoto } from '../../components/BookingRequestKitchenDetailsFields';
import {
    BookingRequestOfferPriceImpactPreview,
    BookingRequestOfferTravelImpactPreview,
} from '../../components/BookingRequestOfferImpactPreviews';
import { BookingRequestParticipantsRestrictionsEditor } from '../../components/BookingRequestParticipantsRestrictionsEditor';
import { BookingRequestSettingPicker } from '../../components/BookingRequestSettingPicker';
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
    ProfileCustomerBookingRequestKitchenDetailsUpdateDocument,
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

export function profileCustomerBookingRequestEditPageTitle(locale: Locale): string {
    return t(locale, 'profileCustomer', 'bookingRequestEdit.title');
}
export function profileCustomerBookingRequestEditPageDescription(locale: Locale): string {
    return t(locale, 'profileCustomer', 'bookingRequestEdit.description');
}

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
    settingChoice: BookingRequestSettingChoice;
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
        settingChoice: bookingRequestSettingChoiceFromStored(request.setting),
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

function participantsFromRequest(
    request: NonNullable<GqlCProfileCustomerBookingRequestPageUserFragment['bookingRequest']>,
): BookingRequestParticipantDraft[] {
    return request.participants.map((participant) => ({
        type: participant.type,
        name: participant.name,
        restrictions: [...participant.restrictions],
    }));
}

function participantsEqual(a: BookingRequestParticipantDraft[], b: BookingRequestParticipantDraft[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((participant, index) => {
        const other = b[index];
        if (other == null) return false;
        if (participant.type !== other.type || participant.name !== other.name) return false;
        if (participant.restrictions.length !== other.restrictions.length) return false;
        return participant.restrictions.every((restriction, restrictionIndex) => restriction === other.restrictions[restrictionIndex]);
    });
}

function kitchenDraftEqual(a: BookingRequestKitchenDetailsDraft, b: BookingRequestKitchenDetailsDraft): boolean {
    return (
        a.availability === b.availability &&
        a.fridgeSpace === b.fridgeSpace &&
        a.platingSpace === b.platingSpace &&
        a.guestTableware === b.guestTableware &&
        a.notes === b.notes
    );
}

function kitchenPhotosEqual(a: readonly BookingRequestKitchenDetailsPhoto[], b: readonly BookingRequestKitchenDetailsPhoto[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((photo, index) => photo.fileUploadId === b[index]?.fileUploadId);
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
    const offerAmendmentEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_AMENDMENT');
    const priceImpactPreviewEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_PRICE_IMPACT_PREVIEW');
    const canUpdate = request != null && bookingRequestCanUpdate(request);
    const amendableOffer =
        request?.offers.find((offer) => offer.canRequestParticipantAmendment) ??
        seedRequest.offers.find((offer) => offer.canRequestParticipantAmendment) ??
        null;
    const pendingAmendmentOffer =
        request?.offers.find((offer) => offer.participantAmendment != null) ??
        seedRequest.offers.find((offer) => offer.participantAmendment != null) ??
        null;
    const isParticipantAmendmentMode = !canUpdate && offerAmendmentEnabled && (amendableOffer != null || pendingAmendmentOffer != null);
    const canStayOnEdit = canUpdate || isParticipantAmendmentMode;

    const [locationSearchText, setLocationSearchText] = useState(seedRequest.exactEventAddress.displayText);
    const [customPreferenceText, setCustomPreferenceText] = useState('');
    const [, updateRequest] = useMutation(ProfileBookingRequestUpdateDocument);
    const [, updateKitchenDetails] = useMutation(ProfileCustomerBookingRequestKitchenDetailsUpdateDocument);
    const [, createParticipantAmendment] = useMutation(ProfileCustomerBookingRequestParticipantAmendmentCreateDocument);
    const restrictionsEnabled = useFeatureToggleActive('BOOKING_REQUEST_RESTRICTIONS');
    const settingEnabled = useFeatureToggleActive('BOOKING_REQUEST_SETTING');
    const kitchenEnabled = useFeatureToggleActive('BOOKING_REQUEST_KITCHEN_DETAILS');
    const [kitchenDraft, setKitchenDraft] = useState(() => bookingRequestKitchenDetailsDraftFromGql(seedRequest.kitchenDetails));
    const [kitchenPhotos, setKitchenPhotos] = useState<BookingRequestKitchenDetailsPhoto[]>(() =>
        bookingRequestKitchenDetailsPhotosFromGql(seedRequest.kitchenDetails?.photos),
    );
    const [participants, setParticipants] = useState<BookingRequestParticipantDraft[]>(() => participantsFromRequest(seedRequest));

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
                    toast.error(t(locale, 'profileCustomer', 'bookingRequestEdit.changeRequired'));
                    return;
                }
                if (locationChangedForAmendment && !value.exactEventAddress.displayText.trim()) {
                    toast.error(t(locale, 'profileCustomer', 'bookingRequestEdit.fullAddressRequired'));
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
                    toast.success(t(locale, 'profileCustomer', 'bookingRequestEdit.proposalSent'));
                    await navigate({
                        to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                        params: { bookingRequestId },
                    });
                } catch {
                    toast.error(t(locale, 'profileCustomer', 'bookingRequestEdit.changeFailed'));
                }
                return;
            }

            if (!bookingRequestCanUpdate(request)) return;
            if (!value.exactEventAddress.displayText.trim()) {
                toast.error(t(locale, 'profileCustomer', 'bookingRequestEdit.fullAddressRequired'));
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
                    ...(settingEnabled ? { setting: bookingRequestSettingFromChoice(value.settingChoice) } : {}),
                });
                if (!result.data?.user.bookingRequestUpdate.success) {
                    throw new Error('update failed');
                }
                if (kitchenEnabled) {
                    const kitchenResult = await updateKitchenDetails({
                        bookingRequestId,
                        kitchenDetails: bookingRequestKitchenDetailsInputFromDraft(kitchenDraft),
                        photoFileUploadIds: kitchenPhotos.map((photo) => photo.fileUploadId),
                    });
                    if (!kitchenResult.data?.user.bookingRequestKitchenDetailsUpdate.success) {
                        throw new Error('kitchen details update failed');
                    }
                }
                toast.success(t(locale, 'profileCustomer', 'bookingRequestEdit.updated'));
                await navigate({
                    to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                    params: { bookingRequestId },
                });
            } catch {
                toast.error(t(locale, 'profileCustomer', 'bookingRequestEdit.updateFailed'));
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
    const comparisonRequest = request ?? seedRequest;
    const participantsDirty = !participantsEqual(participants, participantsFromRequest(comparisonRequest));
    const kitchenDirty =
        kitchenEnabled &&
        !isParticipantAmendmentMode &&
        (!kitchenDraftEqual(kitchenDraft, bookingRequestKitchenDetailsDraftFromGql(comparisonRequest.kitchenDetails)) ||
            !kitchenPhotosEqual(kitchenPhotos, bookingRequestKitchenDetailsPhotosFromGql(comparisonRequest.kitchenDetails?.photos)));
    const hasUnsavedChanges = isDirty || participantsDirty || kitchenDirty;

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
        pause: !priceImpactPreviewEnabled || !headcountChanged || !hasOffers,
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
        if (!hasUnsavedChanges) {
            form.reset(formFromRequest(request));
            setLocationSearchText(request.exactEventAddress.displayText);
            setParticipants(participantsFromRequest(request));
            setKitchenDraft(bookingRequestKitchenDetailsDraftFromGql(request.kitchenDetails));
            setKitchenPhotos(bookingRequestKitchenDetailsPhotosFromGql(request.kitchenDetails?.photos));
        }
    }, [bookingRequestId, canStayOnEdit, form, hasUnsavedChanges, navigate, request, user]);

    if (request == null || !canStayOnEdit) {
        return null;
    }

    const pendingAmendment = pendingAmendmentOffer?.participantAmendment ?? null;
    const amendmentSubmitDisabled =
        isParticipantAmendmentMode && (pendingAmendment != null || amendableOffer == null || isSubmitting || !hasUnsavedChanges);
    const fullSubmitDisabled =
        !isParticipantAmendmentMode &&
        (isSubmitting || !hasUnsavedChanges || occasion.trim().length === 0 || exactEventAddress.displayText.trim().length === 0);

    return (
        <ProfilePinnedFooterLayout
            contentClassName="grid max-w-xl content-start gap-8"
            footer={
                hasUnsavedChanges ? (
                    <>
                        <Button type="button" variant="outline" disabled={isSubmitting} asChild>
                            <Link to="/{-$locale}/profile/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                                {t(locale, 'common', 'cancel')}
                            </Link>
                        </Button>
                        {pendingAmendment == null ? (
                            <Button
                                type="submit"
                                form="booking-request-edit-form"
                                disabled={isParticipantAmendmentMode ? amendmentSubmitDisabled : fullSubmitDisabled}
                            >
                                {isSubmitting
                                    ? t(locale, 'profileCustomer', 'actions.sending')
                                    : isParticipantAmendmentMode
                                      ? t(locale, 'profileCustomer', 'bookingRequestEdit.requestChanges')
                                      : t(locale, 'common', 'save')}
                            </Button>
                        ) : null}
                    </>
                ) : (
                    <Button type="button" disabled={isSubmitting} asChild>
                        <Link to="/{-$locale}/profile/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                            {t(locale, 'profileCustomer', 'bookingRequestEdit.backToRequest')}
                        </Link>
                    </Button>
                )
            }
        >
            {isParticipantAmendmentMode ? (
                pendingAmendment != null ? (
                    <StatusAlert
                        tone="info"
                        title={
                            pendingAmendment.claimedAt != null
                                ? t(locale, 'profileCustomer', 'bookingRequestEdit.applying')
                                : t(locale, 'profileCustomer', 'bookingRequestEdit.proposed')
                        }
                    >
                        {pendingAmendment.claimedAt != null
                            ? t(locale, 'profileCustomer', 'bookingRequestEdit.chefAccepted')
                            : t(locale, 'profileCustomer', 'bookingRequestEdit.waitingChef')}
                    </StatusAlert>
                ) : (
                    <StatusAlert tone="warning" title={t(locale, 'profileCustomer', 'bookingRequestEdit.changeTitle')}>
                        {t(locale, 'profileCustomer', 'bookingRequestEdit.changeBody')}
                    </StatusAlert>
                )
            ) : (
                <StatusAlert tone="warning" title={t(locale, 'profileCustomer', 'bookingRequestEdit.materialChanges')}>
                    {t(locale, 'profileCustomer', 'bookingRequestEdit.priceMayAdjust')}
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
                                            {t(locale, 'profileCustomer', 'bookingRequestEdit.occasion')}
                                        </label>
                                        <Input
                                            id="booking-request-occasion"
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            placeholder={t(locale, 'profileCustomer', 'bookingRequestEdit.occasionPlaceholder')}
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
                                    <span className="text-sm font-medium">
                                        {t(locale, 'profileCustomer', 'bookingRequestEdit.dateTime')}
                                    </span>
                                    <DateTimePicker
                                        value={new Date(field.state.value)}
                                        onValueChange={(date) => field.handleChange(date.toISOString())}
                                        placeholder={t(locale, 'profileCustomer', 'bookingRequestEdit.dateTime')}
                                        timeAriaLabel={t(locale, 'profileCustomer', 'bookingRequestEdit.time')}
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
                            <span className="text-sm font-medium">{t(locale, 'profileCustomer', 'bookingRequestEdit.venue')}</span>
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
                                        toast.error(t(locale, 'profileCustomer', 'bookingRequestEdit.fullAddressRequired'));
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
                                    placeholder={t(locale, 'profileCustomer', 'actions.searchAddress')}
                                    showClear={false}
                                    disabled={isSubmitting || pendingAmendment != null}
                                    required={!field.state.value.displayText}
                                />
                                <ComboboxContent>
                                    <ComboboxEmpty>
                                        {suggestionsFetching
                                            ? t(locale, 'profileCustomer', 'actions.searching')
                                            : t(locale, 'profileCustomer', 'actions.noMatches')}
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
                {settingEnabled && !isParticipantAmendmentMode ? (
                    <form.Field name="settingChoice">
                        {(field) => (
                            <BookingRequestSettingPicker
                                locale={locale}
                                value={field.state.value}
                                disabled={isSubmitting}
                                onChange={(next) => field.handleChange(next)}
                            />
                        )}
                    </form.Field>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                    <form.Field name="adultCount">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="booking-request-adults" className="text-sm font-medium">
                                    {t(locale, 'profileCustomer', 'bookingRequestEdit.adults')}
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
                                    {t(locale, 'profileCustomer', 'bookingRequestEdit.children')}
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
                {priceImpactPreviewEnabled && headcountChanged && hasOffers ? (
                    <BookingRequestOfferPriceImpactPreview impacts={priceImpacts} fetching={priceImpactFetching} locale={locale} />
                ) : null}
                {!isParticipantAmendmentMode ? (
                    <div className="grid gap-3">
                        <span className="text-sm font-medium">{t(locale, 'profileCustomer', 'bookingRequestEdit.preferences')}</span>
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <Input
                                value={customPreferenceText}
                                onChange={(event) => setCustomPreferenceText(event.target.value)}
                                placeholder={t(locale, 'profileCustomer', 'bookingRequestEdit.preferencePlaceholder')}
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
                                {t(locale, 'profileCustomer', 'bookingRequestEdit.addCustom')}
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
                                            {t(locale, 'profileCustomer', 'bookingRequestEdit.preferenceLimit')}
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
                            <span className="text-sm font-medium">{t(locale, 'profileCustomer', 'bookingRequestEdit.restrictions')}</span>
                            <p className="text-sm text-muted-foreground">
                                {t(locale, 'profileCustomer', 'bookingRequestEdit.restrictionsHint')}
                            </p>
                        </div>
                        <BookingRequestParticipantsRestrictionsEditor
                            participants={participants}
                            onChange={setParticipants}
                            disabled={isSubmitting}
                        />
                    </div>
                ) : null}
                {kitchenEnabled && !isParticipantAmendmentMode ? (
                    <div className="grid gap-3">
                        <span className="text-sm font-medium">{t(locale, 'profileCustomer', 'bookingRequestEdit.aboutKitchen')}</span>
                        <BookingRequestKitchenDetailsFields
                            locale={locale}
                            value={kitchenDraft}
                            photos={kitchenPhotos}
                            disabled={isSubmitting}
                            onChange={setKitchenDraft}
                            onPhotosChange={setKitchenPhotos}
                        />
                    </div>
                ) : null}
            </form>
        </ProfilePinnedFooterLayout>
    );
}
