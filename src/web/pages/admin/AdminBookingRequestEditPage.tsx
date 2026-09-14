import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { bookingRequestParticipantsFromCounts } from '../../../shared';
import type { BookingRequestParticipantDraft } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestParticipantsRestrictionsEditor } from '../../components/BookingRequestParticipantsRestrictionsEditor';
import type {
    GqlCAdminBookingRequestEditPageQuery,
    GqlCAdminBookingRequestEditPageRequestFragment,
    GqlCAdminBookingRequestExactEventAddressInput,
    GqlCBookingRequestPriceClassType,
    GqlCLocationSuggestion,
} from '../../graphql/generated';
import { AdminBookingRequestEditLocationSuggestionsDocument, AdminBookingRequestUpdateDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminStubRouteBySlug } from './adminCatalog';

const listRoute = adminStubRouteBySlug('booking-requests');

export const adminBookingRequestEditPageTitle = { de: 'Anfrage bearbeiten', en: 'Edit request' } as const;
export const adminBookingRequestEditPageDescription = {
    de: 'Anlass, Termin, Ort, Nachrichten, Preisklasse und Einschränkungen anpassen.',
    en: 'Edit occasion, date, venue, messages, price class, and restrictions.',
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
    };
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
    const [locationSearchText, setLocationSearchText] = useState(seedRequest.exactEventAddress.displayText);
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
            if (value.occasion.trim().length === 0) {
                toast.error({ de: 'Anlass ist erforderlich.', en: 'Occasion is required.' }[locale]);
                return;
            }
            if (value.originalMessage.trim().length === 0) {
                toast.error({ de: 'Nachricht ist erforderlich.', en: 'Message is required.' }[locale]);
                return;
            }
            if (value.exactEventAddress.displayText.trim().length === 0) {
                toast.error({ de: 'Veranstaltungsort ist erforderlich.', en: 'Event location is required.' }[locale]);
                return;
            }

            try {
                const nextParticipants = bookingRequestParticipantsFromCounts({
                    adultCount: Math.max(1, value.adultCount),
                    discountedCount: Math.max(0, value.childCount),
                    locale,
                    previous: participants,
                });
                const result = await updateBookingRequest({
                    bookingRequestId,
                    input: {
                        occasion: value.occasion.trim(),
                        dateTime: value.dateTime,
                        originalMessage: value.originalMessage.trim(),
                        adjustedMessage: value.adjustedMessage.trim().length === 0 ? null : value.adjustedMessage.trim(),
                        priceClassType: value.priceClassType === 'NONE' ? undefined : value.priceClassType,
                        expiresAt: value.expiresAt,
                        createdAt: value.createdAt,
                        exactEventAddress: value.exactEventAddress,
                        participants: nextParticipants,
                    },
                });
                if (!result.data?.admin.bookingRequestUpdate.success) {
                    throw new Error('update failed');
                }
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
        query: AdminBookingRequestEditLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || exactEventAddress.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

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
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl/tight text-foreground">{adminBookingRequestEditPageTitle[locale]}</h1>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Ops-Patch für Felder ohne Annahme-Reset. Änderungen an Teilnehmern oder Einschränkungen setzen die Koch-Annahme zurück.',
                                en: 'Ops patch for fields without acceptance reset. Changing guests or restrictions resets cook acceptance.',
                            }[locale]
                        }
                    </p>
                </div>

                <form
                    className="grid max-w-xl gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    {restrictionsEnabled ? (
                        <StatusAlert tone="warning">
                            {
                                {
                                    de: 'Änderungen an Gästen oder Einschränkungen setzen die Annahme bestehender Angebote zurück.',
                                    en: 'Changing guests or restrictions resets acceptance on existing offers.',
                                }[locale]
                            }
                        </StatusAlert>
                    ) : null}
                    <form.Field name="occasion">
                        {(field) => (
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
                                />
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="dateTime">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <span className="text-sm font-medium">{{ de: 'Termin', en: 'Event date' }[locale]}</span>
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
                                                    de: 'Adresse unvollständig. Bitte eine vollständige Adresse wählen.',
                                                    en: 'Incomplete address. Please pick a full address.',
                                                }[locale],
                                            );
                                            return;
                                        }
                                        field.handleChange(address);
                                        setLocationSearchText(address.displayText);
                                    }}
                                    onInputValueChange={setLocationSearchText}
                                >
                                    <ComboboxInput placeholder={{ de: 'Adresse suchen…', en: 'Search address…' }[locale]} />
                                    <ComboboxContent>
                                        <ComboboxEmpty>
                                            {suggestionsFetching
                                                ? { de: 'Suche…', en: 'Searching…' }[locale]
                                                : { de: 'Keine Treffer', en: 'No matches' }[locale]}
                                        </ComboboxEmpty>
                                        <ComboboxList>
                                            {suggestions.map((suggestion) => (
                                                <ComboboxItem key={suggestion.displayText} value={suggestion.displayText}>
                                                    {suggestion.displayText}
                                                </ComboboxItem>
                                            ))}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
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
                                    />
                                </div>
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
                                disabled={isSubmitting}
                            />
                        </div>
                    ) : null}

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
                                />
                                {field.state.value ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => field.handleChange(null)}
                                        className="justify-self-end"
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
                                />
                            </div>
                        )}
                    </form.Field>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link to="/{-$locale}/admin/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Link>
                        </Button>
                    </div>
                </form>
            </main>
        </AdminPageChrome>
    );
}
