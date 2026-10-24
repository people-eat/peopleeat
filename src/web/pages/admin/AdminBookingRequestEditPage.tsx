import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { CakeIcon, ChevronDownIcon, GemIcon, HeartHandshakeIcon, HeartIcon, UsersIcon, UsersRoundIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import {
    bookingRequestOfferPriceCalculate,
    bookingRequestParticipantsFromCounts,
    defaultBookingRequestOccasions,
    defaultBookingRequestPreferences,
    textNormalizeTitled,
} from '../../../shared';
import type { BookingRequestParticipantDraft } from '../../../shared';
import { AdminBookingRequestOfferAmendmentConfirmDialog } from '../../components/AdminBookingRequestOfferAmendmentConfirmDialog';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import {
    BookingRequestOfferPriceImpactPreview,
    BookingRequestOfferTravelImpactPreview,
} from '../../components/BookingRequestOfferImpactPreviews';
import { BookingRequestOfferParticipantAmendmentAdminPendingAlert } from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import { BookingRequestParticipantsRestrictionsEditor } from '../../components/BookingRequestParticipantsRestrictionsEditor';
import { SelectableChip } from '../../components/SelectableChip';
import type {
    GqlCAdminBookingRequestEditPageQuery,
    GqlCAdminBookingRequestEditPageRequestFragment,
    GqlCAdminBookingRequestExactEventAddressInput,
    GqlCBookingRequestPriceClassType,
    GqlCLocationSuggestion,
} from '../../graphql/generated';
import {
    AdminBookingRequestEditAmendmentApplyDocument,
    AdminBookingRequestEditAmendmentCreateDocument,
    AdminBookingRequestEditLocationSuggestionsDocument,
    AdminBookingRequestEditPriceImpactDocument,
    AdminBookingRequestEditTravelImpactDocument,
    AdminBookingRequestUpdateDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminStubRouteBySlug } from './adminCatalog';

const listRoute = adminStubRouteBySlug('booking-requests');
const FORM_ID = 'admin-booking-request-edit-form';

const occasionIcons = [
    <CakeIcon className="size-4" key="cake-1" />,
    <CakeIcon className="size-4" key="cake-2" />,
    <HeartIcon className="size-4" key="heart" />,
    <GemIcon className="size-4" key="gem" />,
    <UsersRoundIcon className="size-4" key="users-round" />,
    <HeartHandshakeIcon className="size-4" key="handshake" />,
    <UsersIcon className="size-4" key="users" />,
];

export const adminBookingRequestEditPageTitle = { de: 'Anfrage bearbeiten', en: 'Edit request' } as const;
export const adminBookingRequestEditPageDescription = {
    de: 'Anlass, Termin, Ort, Präferenzen, Nachrichten, Preisklasse und Einschränkungen anpassen.',
    en: 'Edit occasion, date, venue, preferences, messages, price class, and restrictions.',
} as const;

export function adminBookingRequestEditPageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

type FormValues = {
    occasion: string;
    dateTime: string;
    originalMessage: string;
    adjustedMessage: string;
    priceClassType: GqlCBookingRequestPriceClassType | 'NONE';
    expiresAt: string | null;
    createdAt: string;
    exactEventAddress: GqlCAdminBookingRequestExactEventAddressInput;
    adultCount: number;
    childCount: number;
    preferences: string[];
};

const PRICE_CLASS_OPTIONS: readonly { value: GqlCBookingRequestPriceClassType | 'NONE'; de: string; en: string }[] = [
    { value: 'NONE', de: 'Keine', en: 'None' },
    { value: 'LOW', de: 'Niedrig', en: 'Low' },
    { value: 'MEDIUM', de: 'Mittel', en: 'Medium' },
    { value: 'HIGH', de: 'Hoch', en: 'High' },
];

function addressFromRequest(
    address: GqlCAdminBookingRequestEditPageRequestFragment['exactEventAddress'],
): GqlCAdminBookingRequestExactEventAddressInput {
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

function formFromRequest(request: GqlCAdminBookingRequestEditPageRequestFragment): FormValues {
    return {
        occasion: request.occasion,
        dateTime: request.dateTime,
        originalMessage: request.originalMessage,
        adjustedMessage: request.adjustedMessage ?? '',
        priceClassType: request.priceClassType ?? 'NONE',
        expiresAt: request.expiresAt,
        createdAt: request.createdAt,
        exactEventAddress: addressFromRequest(request.exactEventAddress),
        adultCount: request.participants.filter((participant) => participant.type === 'ADULT').length || 1,
        childCount: request.participants.filter((participant) => participant.type === 'DISCOUNTED').length,
        preferences: [...request.preferences],
    };
}

function participantsFromRequest(request: GqlCAdminBookingRequestEditPageRequestFragment): BookingRequestParticipantDraft[] {
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

function exactEventAddressEqual(
    a: GqlCAdminBookingRequestExactEventAddressInput,
    b: GqlCAdminBookingRequestExactEventAddressInput,
): boolean {
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

export function AdminBookingRequestEditPage({
    data,
    bookingRequestId,
}: {
    data: GqlCAdminBookingRequestEditPageQuery;
    bookingRequestId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const seedRequest = data.currentSession.user?.admin?.bookingRequest ?? null;
    if (!seedRequest) throw notFound();

    const [, updateBookingRequest] = useMutation(AdminBookingRequestUpdateDocument);
    const [, amendmentCreate] = useMutation(AdminBookingRequestEditAmendmentCreateDocument);
    const [, amendmentApply] = useMutation(AdminBookingRequestEditAmendmentApplyDocument);
    const [locationSearchText, setLocationSearchText] = useState(seedRequest.exactEventAddress.displayText);
    const [customPreferenceText, setCustomPreferenceText] = useState('');
    const [restrictionsExpanded, setRestrictionsExpanded] = useState(false);
    const restrictionsPanelId = useId();
    const restrictionsEnabled = useFeatureToggleActive('BOOKING_REQUEST_RESTRICTIONS');
    const [participants, setParticipants] = useState<BookingRequestParticipantDraft[]>(() => participantsFromRequest(seedRequest));
    const seedParticipants = participantsFromRequest(seedRequest);
    const dualAcceptedOffer = seedRequest.offers.find((offer) => offer.userAccepted === true && offer.cookAccepted === true) ?? null;
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState<{
        requestInput: {
            occasion: string;
            dateTime: string;
            originalMessage: string;
            adjustedMessage: string | null;
            priceClassType: GqlCBookingRequestPriceClassType | undefined;
            expiresAt: string | null | undefined;
            createdAt: string;
            preferences: string[];
            exactEventAddress?: GqlCAdminBookingRequestExactEventAddressInput;
            participants?: BookingRequestParticipantDraft[];
        };
        amendmentInput: {
            participants?: BookingRequestParticipantDraft[];
            exactEventAddress?: GqlCAdminBookingRequestExactEventAddressInput;
        } | null;
    } | null>(null);

    async function persistRequestUpdate(requestInput: NonNullable<typeof pendingSubmit>['requestInput']) {
        const result = await updateBookingRequest({
            bookingRequestId,
            input: requestInput,
        });
        if (!result.data?.admin.bookingRequestUpdate.success) {
            throw new Error('update failed');
        }
    }

    async function applyConfirmedDualAcceptEdit(bypassCookApproval: boolean) {
        if (!pendingSubmit || !dualAcceptedOffer) return;
        setConfirmBusy(true);
        try {
            if (pendingSubmit.amendmentInput) {
                if (bypassCookApproval) {
                    const result = await amendmentApply({
                        bookingRequestOfferId: dualAcceptedOffer.bookingRequestOfferId,
                        input: pendingSubmit.amendmentInput,
                    });
                    if (!result.data?.admin.bookingRequestOfferAmendmentApply.success) {
                        throw new Error('amendment failed');
                    }
                } else {
                    const result = await amendmentCreate({
                        bookingRequestOfferId: dualAcceptedOffer.bookingRequestOfferId,
                        input: pendingSubmit.amendmentInput,
                    });
                    if (!result.data?.admin.bookingRequestOfferAmendmentCreate.success) {
                        throw new Error('amendment failed');
                    }
                }
            }
            await persistRequestUpdate(pendingSubmit.requestInput);
            toast.success(
                pendingSubmit.amendmentInput
                    ? bypassCookApproval
                        ? { de: 'Buchungsänderung angewendet.', en: 'Booking change applied.' }[locale]
                        : { de: 'Buchungsänderung dem Koch vorgeschlagen.', en: 'Booking change proposed to the chef.' }[locale]
                    : { de: 'Anfrage aktualisiert.', en: 'Request updated.' }[locale],
            );
            setConfirmOpen(false);
            await navigate({
                to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                params: { bookingRequestId },
            });
        } catch {
            toast.error({ de: 'Aktualisierung fehlgeschlagen.', en: 'Update failed.' }[locale]);
        } finally {
            setConfirmBusy(false);
        }
    }

    const form = useForm({
        defaultValues: formFromRequest(seedRequest),
        onSubmit: async ({ value }) => {
            if (value.occasion.trim().length === 0) {
                toast.error({ de: 'Anlass ist erforderlich.', en: 'Occasion is required.' }[locale]);
                return;
            }
            if (value.originalMessage.trim().length === 0) {
                toast.error({ de: 'Nachricht ist erforderlich.', en: 'Message is required.' }[locale]);
                return;
            }
            if (value.exactEventAddress.displayText.trim().length === 0) {
                toast.error({ de: 'Bitte eine vollständige Adresse wählen.', en: 'Please choose a full address.' }[locale]);
                return;
            }

            const nextParticipants = bookingRequestParticipantsFromCounts({
                adultCount: Math.max(1, value.adultCount),
                discountedCount: Math.max(0, value.childCount),
                locale,
                previous: participants,
            });
            const preferences = value.preferences
                .map((preference) => textNormalizeTitled(preference))
                .filter((preference) => preference.length > 0)
                .slice(0, 4);
            const seedAddress = addressFromRequest(seedRequest.exactEventAddress);
            const venueChanged = !exactEventAddressEqual(value.exactEventAddress, seedAddress);
            const seedAdultCount = seedRequest.participants.filter((participant) => participant.type === 'ADULT').length || 1;
            const seedChildCount = seedRequest.participants.filter((participant) => participant.type === 'DISCOUNTED').length;
            const guestsChanged = value.adultCount !== seedAdultCount || value.childCount !== seedChildCount;

            if (dualAcceptedOffer && (venueChanged || guestsChanged)) {
                const allowedPayment =
                    dualAcceptedOffer.paymentStatus === 'EMPTY' ||
                    dualAcceptedOffer.paymentStatus === 'SETUP' ||
                    dualAcceptedOffer.paymentStatus === 'PAYED';
                if (!allowedPayment) {
                    toast.error(
                        {
                            de: `Zahlungsstatus ${dualAcceptedOffer.paymentStatus} erlaubt keine Änderung (nur EMPTY, SETUP oder PAYED).`,
                            en: `Payment status ${dualAcceptedOffer.paymentStatus} does not allow changes (only EMPTY, SETUP, or PAYED).`,
                        }[locale],
                    );
                    return;
                }
                setPendingSubmit({
                    requestInput: {
                        occasion: textNormalizeTitled(value.occasion),
                        dateTime: value.dateTime,
                        originalMessage: value.originalMessage.trim(),
                        adjustedMessage: value.adjustedMessage.trim().length === 0 ? null : value.adjustedMessage.trim(),
                        priceClassType: value.priceClassType === 'NONE' ? undefined : value.priceClassType,
                        expiresAt: value.expiresAt,
                        createdAt: value.createdAt,
                        preferences,
                    },
                    amendmentInput: {
                        ...(guestsChanged ? { participants: nextParticipants } : {}),
                        ...(venueChanged ? { exactEventAddress: value.exactEventAddress } : {}),
                    },
                });
                setConfirmOpen(true);
                return;
            }

            try {
                await persistRequestUpdate({
                    occasion: textNormalizeTitled(value.occasion),
                    dateTime: value.dateTime,
                    originalMessage: value.originalMessage.trim(),
                    adjustedMessage: value.adjustedMessage.trim().length === 0 ? null : value.adjustedMessage.trim(),
                    priceClassType: value.priceClassType === 'NONE' ? undefined : value.priceClassType,
                    expiresAt: value.expiresAt,
                    createdAt: value.createdAt,
                    preferences,
                    ...(dualAcceptedOffer
                        ? {}
                        : {
                              exactEventAddress: value.exactEventAddress,
                              participants: nextParticipants,
                          }),
                });
                toast.success({ de: 'Anfrage aktualisiert.', en: 'Request updated.' }[locale]);
                await navigate({
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
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
    const participantsDirty = !participantsEqual(participants, seedParticipants);
    const hasUnsavedChanges = isDirty || participantsDirty;
    const submitDisabled =
        isSubmitting || !hasUnsavedChanges || occasion.trim().length === 0 || exactEventAddress.displayText.trim().length === 0;

    const defaultPreferences = defaultBookingRequestPreferences(locale);
    const preferenceOptionsCustom = preferences.filter((preference) => !defaultPreferences.includes(preference));
    const preferenceOptions = [...defaultPreferences, ...preferenceOptionsCustom].filter((option) =>
        option.toLowerCase().includes(customPreferenceText.toLowerCase()),
    );
    const restrictedGuestCount = participants.filter((participant) => participant.restrictions.length > 0).length;
    const guestTotal = participants.length;

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
        query: AdminBookingRequestEditLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || exactEventAddress.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    const seedAddress = addressFromRequest(seedRequest.exactEventAddress);
    const locationChanged = exactEventAddress.displayText.trim().length > 0 && !exactEventAddressEqual(exactEventAddress, seedAddress);
    const seedAdultCount = seedRequest.participants.filter((participant) => participant.type === 'ADULT').length || 1;
    const seedChildCount = seedRequest.participants.filter((participant) => participant.type === 'DISCOUNTED').length;
    const headcountChanged = adultCount !== seedAdultCount || childCount !== seedChildCount;
    const hasOffers = seedRequest.offers.length > 0;
    const [{ data: travelImpactData, fetching: travelImpactFetching }] = useQuery({
        query: AdminBookingRequestEditTravelImpactDocument,
        variables: { bookingRequestId, exactEventAddress },
        pause: !locationChanged || !hasOffers,
    });
    const travelImpacts = travelImpactData?.currentSession.user?.admin?.bookingRequest?.travelImpact ?? [];
    const [{ data: priceImpactData, fetching: priceImpactFetching }] = useQuery({
        query: AdminBookingRequestEditPriceImpactDocument,
        variables: { bookingRequestId, participantsAdult: adultCount, participantsDiscounted: childCount },
        pause: !headcountChanged || !hasOffers,
    });
    const priceImpacts = priceImpactData?.currentSession.user?.admin?.bookingRequest?.priceImpact ?? [];
    const dualAcceptedPriceImpact = dualAcceptedOffer
        ? (priceImpacts.find((impact) => impact.bookingRequestOfferId === dualAcceptedOffer.bookingRequestOfferId) ?? null)
        : null;
    const dualAcceptedTravelImpact = dualAcceptedOffer
        ? (travelImpacts.find((impact) => impact.bookingRequestOfferId === dualAcceptedOffer.bookingRequestOfferId) ?? null)
        : null;
    const previewMenuCents = dualAcceptedPriceImpact?.menuPriceCentsAfter ?? dualAcceptedOffer?.menuPriceCents ?? 0;
    const previewTravelCents = dualAcceptedTravelImpact?.travelExpensesCentsAfter ?? dualAcceptedOffer?.travelExpensesCents ?? 0;
    const previewPrice = bookingRequestOfferPriceCalculate({
        menuPriceCents: previewMenuCents,
        travelExpensesCents: previewTravelCents,
        ...(dualAcceptedOffer != null
            ? {
                  platformFeePercentCook: dualAcceptedOffer.platformFeePercentCook,
                  platformFeePercentCustomer: dualAcceptedOffer.platformFeePercentCustomer,
              }
            : {}),
    });
    const previewDiscountCents = dualAcceptedOffer
        ? Math.max(
              0,
              dualAcceptedOffer.totalWithoutDiscountsCentsCustomer -
                  (dualAcceptedOffer.totalCentsCustomer ?? dualAcceptedOffer.totalWithoutDiscountsCentsCustomer),
          )
        : 0;
    // Prefer server impact (promo + gift re-apply) for headcount-only; local estimate when travel also moves.
    const previewTotalCustomer =
        dualAcceptedPriceImpact != null && headcountChanged && !locationChanged
            ? dualAcceptedPriceImpact.totalCentsCustomerAfter
            : Math.max(0, previewPrice.totalWithoutDiscountsCentsCustomer - previewDiscountCents);

    return (
        <AdminPageChrome
            crumbs={[
                { label: listRoute.title[locale], to: '/{-$locale}/admin/booking-requests' },
                {
                    label: seedRequest.occasion.trim() || { de: 'Anfrage', en: 'Request' }[locale],
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                    params: { bookingRequestId },
                },
                { label: adminBookingRequestEditPageTitle[locale] },
            ]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            <AdminPinnedFooterLayout
                contentClassName="grid w-full max-w-xl content-start gap-8"
                footer={
                    hasUnsavedChanges ? (
                        <>
                            <Button type="button" variant="outline" disabled={isSubmitting || confirmBusy} asChild>
                                <Link to="/{-$locale}/admin/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Link>
                            </Button>
                            <Button type="submit" form={FORM_ID} disabled={submitDisabled || confirmBusy}>
                                {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                            </Button>
                        </>
                    ) : (
                        <Button type="button" disabled={isSubmitting} asChild>
                            <Link to="/{-$locale}/admin/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                                {{ de: 'Zur Anfrage', en: 'Back to request' }[locale]}
                            </Link>
                        </Button>
                    )
                }
            >
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl/tight text-foreground">{adminBookingRequestEditPageTitle[locale]}</h1>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Ops-Patch. Änderungen an Ort, Teilnehmern, Präferenzen oder Einschränkungen setzen die Koch-Annahme zurück und können Angebotspreise automatisch anpassen.',
                                en: 'Ops patch. Changing venue, guests, preferences, or restrictions resets cook acceptance and may auto-adjust offer prices.',
                            }[locale]
                        }
                    </p>
                </div>

                <StatusAlert
                    tone="warning"
                    title={
                        dualAcceptedOffer
                            ? {
                                  de: 'Dual akzeptiertes Angebot: Ort und Teilnehmer laufen über Amendment.',
                                  en: 'Dual-accepted offer: venue and participants use the amendment path.',
                              }[locale]
                            : {
                                  de: 'Wesentliche Änderungen müssen vom Koch erneut bestätigt werden.',
                                  en: 'Material changes require the chef to confirm again.',
                              }[locale]
                    }
                >
                    {dualAcceptedOffer
                        ? {
                              de: 'Preisfolgen, Zahlungsstatus und ob du die Koch-Freigabe überspringst, wählst du vor dem Speichern im Bestätigungsdialog.',
                              en: 'Price effects, payment status, and whether to skip cook approval are chosen in the confirm dialog before save.',
                          }[locale]
                        : {
                              de: 'Ändern sich Teilnehmerzahl oder Adresse, kann der Angebotspreis automatisch angepasst werden. Live-Vorschauen erscheinen direkt am Feld. Der Koch bestätigt danach erneut.',
                              en: 'If the guest count or address changes, the offer price may adjust automatically. Live previews appear next to the field. The chef confirms again afterwards.',
                          }[locale]}
                </StatusAlert>

                {dualAcceptedOffer?.participantAmendment != null ? (
                    <BookingRequestOfferParticipantAmendmentAdminPendingAlert
                        locale={locale}
                        amendment={dualAcceptedOffer.participantAmendment}
                        footnote={
                            {
                                de: 'Speichern ersetzt diesen Vorschlag oder wendet ihn im Bestätigungsdialog sofort an.',
                                en: 'Saving replaces this proposal, or applies it immediately from the confirm dialog.',
                            }[locale]
                        }
                    />
                ) : null}

                <form
                    id={FORM_ID}
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field name="occasion">
                        {(field) => (
                            <div className="grid gap-4">
                                <div className="grid gap-1.5">
                                    <label htmlFor="admin-br-occasion" className="text-sm font-medium">
                                        {{ de: 'Anlass', en: 'Occasion' }[locale]}
                                    </label>
                                    <Input
                                        id="admin-br-occasion"
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                        placeholder={{ de: 'z. B. Geburtstag, Firmenfeier', en: 'e.g. Birthday, company dinner' }[locale]}
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
                                    disabled={isSubmitting}
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
                                    <BookingRequestOfferTravelImpactPreview
                                        impacts={travelImpacts}
                                        fetching={travelImpactFetching}
                                        locale={locale}
                                        emphasizeOnSave
                                    />
                                ) : null}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="priceClassType">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <span className="text-sm font-medium">{{ de: 'Preisklasse', en: 'Price class' }[locale]}</span>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(next) => {
                                        field.handleChange(next as FormValues['priceClassType']);
                                    }}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRICE_CLASS_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option[locale]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </form.Field>

                    <div className="grid grid-cols-2 gap-3">
                        <form.Field name="adultCount">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor="admin-br-adults" className="text-sm font-medium">
                                        {{ de: 'Erwachsene', en: 'Adults' }[locale]}
                                    </label>
                                    <Input
                                        id="admin-br-adults"
                                        name={field.name}
                                        type="number"
                                        min={1}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(Number(event.target.value) || 1)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                        </form.Field>
                        <form.Field name="childCount">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor="admin-br-children" className="text-sm font-medium">
                                        {{ de: 'Kinder', en: 'Children' }[locale]}
                                    </label>
                                    <Input
                                        id="admin-br-children"
                                        name={field.name}
                                        type="number"
                                        min={0}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(Number(event.target.value) || 0)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                        </form.Field>
                    </div>
                    {headcountChanged && hasOffers ? (
                        <BookingRequestOfferPriceImpactPreview
                            impacts={priceImpacts}
                            fetching={priceImpactFetching}
                            locale={locale}
                            showCookPayout
                        />
                    ) : null}

                    {restrictionsEnabled ? (
                        <div className="grid gap-3">
                            <button
                                type="button"
                                aria-expanded={restrictionsExpanded}
                                aria-controls={restrictionsPanelId}
                                onClick={() => setRestrictionsExpanded((current) => !current)}
                                className={cn(
                                    'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left',
                                    'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                )}
                            >
                                <span className="grid min-w-0 gap-0.5">
                                    <span className="text-sm font-medium">
                                        {{ de: 'Gäste & Einschränkungen', en: 'Guests & restrictions' }[locale]}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {
                                            {
                                                de: `${guestTotal} Gäste · ${restrictedGuestCount} mit Einschränkungen`,
                                                en: `${guestTotal} guests · ${restrictedGuestCount} with restrictions`,
                                            }[locale]
                                        }
                                    </span>
                                </span>
                                <ChevronDownIcon
                                    aria-hidden
                                    className={cn(
                                        'size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none',
                                        restrictionsExpanded && 'rotate-180',
                                    )}
                                />
                            </button>
                            <div id={restrictionsPanelId} hidden={!restrictionsExpanded} className="grid gap-3">
                                <p className="text-sm text-muted-foreground">
                                    {
                                        {
                                            de: 'Wähle die zutreffenden Einschränkungen pro Gast.',
                                            en: 'Select the applicable restrictions per guest.',
                                        }[locale]
                                    }
                                </p>
                                <BookingRequestParticipantsRestrictionsEditor
                                    participants={participants}
                                    onChange={setParticipants}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    ) : null}

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

                    <form.Field name="originalMessage">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="admin-br-original-message" className="text-sm font-medium">
                                    {{ de: 'Originalnachricht', en: 'Original message' }[locale]}
                                </label>
                                <Textarea
                                    id="admin-br-original-message"
                                    name={field.name}
                                    rows={4}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="adjustedMessage">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="admin-br-adjusted-message" className="text-sm font-medium">
                                    {{ de: 'Angepasste Nachricht (Koch)', en: 'Adjusted message (cook)' }[locale]}
                                </label>
                                <Textarea
                                    id="admin-br-adjusted-message"
                                    name={field.name}
                                    rows={4}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    placeholder={{ de: 'Leer = Original verwenden', en: 'Empty = use original' }[locale]}
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="expiresAt">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <span className="text-sm font-medium">{{ de: 'Läuft ab', en: 'Expires' }[locale]}</span>
                                <DateTimePicker
                                    value={field.state.value ? new Date(field.state.value) : undefined}
                                    onValueChange={(date) => field.handleChange(date.toISOString())}
                                    placeholder={{ de: 'Ablauf (optional)', en: 'Expiry (optional)' }[locale]}
                                    timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                    locale={DATE_FNS_LOCALE[locale]}
                                    className="w-full"
                                    disabled={isSubmitting}
                                />
                                {field.state.value ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => field.handleChange(null)}
                                        className="justify-self-end"
                                        disabled={isSubmitting}
                                    >
                                        {{ de: 'Ablauf entfernen', en: 'Clear expiry' }[locale]}
                                    </Button>
                                ) : null}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="createdAt">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <span className="text-sm font-medium">{{ de: 'Erstellt am', en: 'Created at' }[locale]}</span>
                                <DateTimePicker
                                    value={new Date(field.state.value)}
                                    onValueChange={(date) => field.handleChange(date.toISOString())}
                                    placeholder={{ de: 'Erstellt am', en: 'Created at' }[locale]}
                                    timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                    locale={DATE_FNS_LOCALE[locale]}
                                    className="w-full"
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}
                    </form.Field>
                </form>
            </AdminPinnedFooterLayout>

            {dualAcceptedOffer ? (
                <AdminBookingRequestOfferAmendmentConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    locale={locale}
                    paymentStatus={dualAcceptedOffer.paymentStatus}
                    totalCentsCustomerBefore={dualAcceptedOffer.totalCentsCustomer ?? dualAcceptedOffer.totalWithoutDiscountsCentsCustomer}
                    totalCentsCustomerAfter={previewTotalCustomer}
                    payoutCentsCookBefore={dualAcceptedOffer.payoutCentsCook}
                    payoutCentsCookAfter={previewPrice.payoutCentsCook}
                    busy={confirmBusy}
                    onConfirm={(bypassCookApproval) => void applyConfirmedDualAcceptEdit(bypassCookApproval)}
                />
            ) : null}
        </AdminPageChrome>
    );
}
