import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { bookingRequestOfferPriceGuidance, centsToEuros, containsPhoneNumber, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Button } from '../../components/base/button';
import { Checkbox } from '../../components/base/checkbox';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestOfferPriceConfigurationPanel } from '../../components/BookingRequestOfferPriceConfigurationPanel';
import type { GqlCAdminBookingRequestOfferCreatePageQuery } from '../../graphql/generated';
import { AdminBookingRequestOfferCreateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { acceptTriadToBool, ADMIN_OFFER_ACCEPT_OPTIONS, parseAdminOfferPriceInputs } from './adminBookingRequestOfferFeeForm';
import type { AdminOfferAcceptTriad, AdminOfferPriceInputFormValues } from './adminBookingRequestOfferFeeForm';
import { adminStubRouteBySlug } from './adminCatalog';

const listRoute = adminStubRouteBySlug('booking-requests');

export const adminBookingRequestOfferCreatePageTitle = { de: 'Angebot anlegen', en: 'Create offer' } as const;
export const adminBookingRequestOfferCreatePageDescription = {
    de: 'Angebot manuell für einen Koch anlegen. Gebühren werden aus Menüpreis und Reisekosten berechnet.',
    en: 'Create an offer manually for a cook. Fees are derived from menu price and travel expenses.',
} as const;

export function adminBookingRequestOfferCreatePageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

export type AdminBookingRequestOfferCreateSearch = {
    cookId?: string;
};

export function parseAdminBookingRequestOfferCreateSearch(search: Record<string, unknown>): AdminBookingRequestOfferCreateSearch {
    const cookId = typeof search.cookId === 'string' && search.cookId.trim().length > 0 ? search.cookId.trim() : undefined;
    return { cookId };
}

type FormValues = AdminOfferPriceInputFormValues & {
    cookId: string;
    userAccepted: AdminOfferAcceptTriad;
    cookAccepted: AdminOfferAcceptTriad;
    notifyCustomer: boolean;
    message: string;
    paymentDateTime: Date | undefined;
    plannedPayoutDateTime: Date | undefined;
    payoutDateTime: Date | undefined;
    createdAt: Date;
};

function participantCounts(participants: { type: string }[]) {
    let adults = 0;
    let discounted = 0;
    for (const participant of participants) {
        if (participant.type === 'ADULT') adults += 1;
        else if (participant.type === 'DISCOUNTED') discounted += 1;
    }
    return { adults, discounted };
}

export function AdminBookingRequestOfferCreatePage({
    data,
    bookingRequestId,
    search,
}: {
    data: GqlCAdminBookingRequestOfferCreatePageQuery;
    bookingRequestId: string;
    search: AdminBookingRequestOfferCreateSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const formId = useId();
    const seedRequest = data.currentSession.user?.admin?.bookingRequest ?? null;
    if (!seedRequest) throw notFound();

    const cooks = seedRequest.cooksInTravelRadius;
    const { adults, discounted } = participantCounts(seedRequest.participants);
    const [, createOffer] = useMutation(AdminBookingRequestOfferCreateDocument);
    const initialCook = (search.cookId ? cooks.find((row) => row.cook.cookId === search.cookId) : undefined) ?? cooks[0];
    const initialTravelExpensesCents =
        initialCook != null ? Math.round(initialCook.estimatedTravelDistanceKm * initialCook.cook.travelExpensesAmount * 2) : 0;

    const [menuPriceCents, setMenuPriceCents] = useState(0);
    const [priceValid, setPriceValid] = useState(false);
    const [travelExpensesCents, setTravelExpensesCents] = useState(initialTravelExpensesCents);

    const form = useForm({
        defaultValues: {
            cookId: initialCook?.cook.cookId ?? '',
            userAccepted: 'PENDING' as AdminOfferAcceptTriad,
            cookAccepted: 'YES' as AdminOfferAcceptTriad,
            notifyCustomer: false as boolean,
            message: '',
            paymentDateTime: undefined as Date | undefined,
            plannedPayoutDateTime: undefined as Date | undefined,
            payoutDateTime: undefined as Date | undefined,
            createdAt: new Date(),
            travelExpensesEuros: initialCook != null ? centsToEuros(initialTravelExpensesCents) : '',
            travelDistanceKm: initialCook != null ? String(Math.round(initialCook.estimatedTravelDistanceKm * 10) / 10) : '',
        } satisfies FormValues,
        onSubmit: async ({ value }) => {
            if (!value.cookId) {
                toast.error({ de: 'Bitte einen Koch auswählen.', en: 'Please choose a cook.' }[locale]);
                return;
            }
            if (seedRequest.canceledAt) {
                toast.error(
                    { de: 'Stornierte Anfragen können kein Angebot erhalten.', en: 'Canceled requests cannot receive offers.' }[locale],
                );
                return;
            }
            if (!priceValid) {
                toast.error({ de: 'Bitte einen gültigen Menüpreis eingeben.', en: 'Please enter a valid menu price.' }[locale]);
                return;
            }
            const trimmedMessage = value.message.trim();
            if (trimmedMessage.length > 0 && containsPhoneNumber(trimmedMessage)) {
                return;
            }

            const fees = parseAdminOfferPriceInputs({ ...value, menuPriceCents });
            if ('error' in fees) {
                toast.error(fees.error[locale]);
                return;
            }

            try {
                const result = await createOffer({
                    input: {
                        bookingRequestId,
                        cookId: value.cookId,
                        userAccepted: acceptTriadToBool(value.userAccepted),
                        cookAccepted: acceptTriadToBool(value.cookAccepted),
                        menuPriceCents: fees.menuPriceCents,
                        travelExpensesCents: fees.travelExpensesCents,
                        travelDistanceKm: fees.travelDistanceKm,
                        createdAt: value.createdAt.toISOString(),
                        paymentDateTime: value.paymentDateTime?.toISOString() ?? null,
                        plannedPayoutDateTime: value.plannedPayoutDateTime?.toISOString() ?? null,
                        payoutDateTime: value.payoutDateTime?.toISOString() ?? null,
                        notifyCustomer: value.notifyCustomer,
                        message: trimmedMessage.length > 0 ? trimmedMessage : null,
                    },
                });
                const referenceId = result.data?.admin.bookingRequestOfferCreate.referenceId;
                if (!result.data?.admin.bookingRequestOfferCreate.success || !referenceId) {
                    throw new Error('create failed');
                }
                toast.success({ de: 'Angebot angelegt.', en: 'Offer created.' }[locale]);
                await navigate({
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                    params: { bookingRequestId, bookingRequestOfferId: referenceId },
                });
            } catch {
                toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create the offer.' }[locale]);
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const selectedCookId = useSelector(form.store, (state) => state.values.cookId);
    const messageDraft = useSelector(form.store, (state) => state.values.message);
    const messageContainsPhoneNumber = containsPhoneNumber(messageDraft);

    const liveGuidance = bookingRequestOfferPriceGuidance({
        priceClassType: seedRequest.priceClassType,
        participantsAdult: adults,
        participantsDiscounted: discounted,
        estimatedTravelExpensesCents: travelExpensesCents,
        promoMinimumTotalAmountCustomerCents: seedRequest.minOfferAmountHardCents,
    });

    function onCookChange(cookId: string) {
        form.setFieldValue('cookId', cookId);
        const row = cooks.find((entry) => entry.cook.cookId === cookId);
        if (!row) return;
        const nextTravel = Math.round(row.estimatedTravelDistanceKm * row.cook.travelExpensesAmount * 2);
        form.setFieldValue('travelDistanceKm', String(Math.round(row.estimatedTravelDistanceKm * 10) / 10));
        form.setFieldValue('travelExpensesEuros', centsToEuros(nextTravel));
        setTravelExpensesCents(nextTravel);
    }

    return (
        <AdminPageChrome
            crumbs={[
                { label: listRoute.title[locale], to: '/{-$locale}/admin/booking-requests' },
                {
                    label: seedRequest.occasion.trim() || { de: 'Anfrage', en: 'Request' }[locale],
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                    params: { bookingRequestId },
                },
                { label: adminBookingRequestOfferCreatePageTitle[locale] },
            ]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl/tight text-foreground">{adminBookingRequestOfferCreatePageTitle[locale]}</h1>
                    <p className="text-sm text-muted-foreground">{adminBookingRequestOfferCreatePageDescription[locale]}</p>
                </div>

                {cooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Keine Köche im Anfahrtsradius. Angebot anlegen ist derzeit nicht möglich.',
                                en: 'No cooks in travel radius. Creating an offer is not available right now.',
                            }[locale]
                        }
                    </p>
                ) : (
                    <form
                        className="grid max-w-xl gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void form.handleSubmit();
                        }}
                    >
                        <form.Field name="cookId">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium">{{ de: 'Koch', en: 'Cook' }[locale]}</span>
                                    <Select
                                        value={field.state.value.length > 0 ? field.state.value : undefined}
                                        onValueChange={(next) => next && onCookChange(next)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={{ de: 'Koch wählen…', en: 'Choose cook…' }[locale]} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cooks.map((row) => {
                                                const city = row.cook.exactTravelOriginAddress?.city;
                                                return (
                                                    <SelectItem key={row.cook.cookId} value={row.cook.cookId}>
                                                        {userDisplayName(row.cook.user)}
                                                        {city ? ` · ${city}` : ''}
                                                        {` · ${Math.round(row.estimatedTravelDistanceKm * 10) / 10} km`}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </form.Field>

                        <div className="grid gap-4 @md:grid-cols-2">
                            <form.Field name="cookAccepted">
                                {(field) => (
                                    <div className="grid gap-1.5">
                                        <span className="text-sm font-medium">
                                            {{ de: 'Koch akzeptiert', en: 'Cook accepted' }[locale]}
                                        </span>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(next) => next && field.handleChange(next as AdminOfferAcceptTriad)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ADMIN_OFFER_ACCEPT_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option[locale]}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </form.Field>
                            <form.Field name="userAccepted">
                                {(field) => (
                                    <div className="grid gap-1.5">
                                        <span className="text-sm font-medium">
                                            {{ de: 'Kunde akzeptiert', en: 'Customer accepted' }[locale]}
                                        </span>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(next) => next && field.handleChange(next as AdminOfferAcceptTriad)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ADMIN_OFFER_ACCEPT_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option[locale]}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </form.Field>
                        </div>

                        <form.Field name="travelExpensesEuros">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${formId}-travel`} className="text-sm font-medium">
                                        {{ de: 'Reisekosten (€)', en: 'Travel expenses (€)' }[locale]}
                                    </label>
                                    <Input
                                        id={`${formId}-travel`}
                                        inputMode="decimal"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => {
                                            field.handleChange(event.target.value);
                                            const parsed = Number.parseFloat(event.target.value.replace(',', '.'));
                                            setTravelExpensesCents(Number.isFinite(parsed) ? Math.round(parsed * 100) : 0);
                                        }}
                                    />
                                </div>
                            )}
                        </form.Field>
                        <form.Field name="travelDistanceKm">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${formId}-distance`} className="text-sm font-medium">
                                        {{ de: 'Reiseentfernung', en: 'Travel distance' }[locale]}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`${formId}-distance`}
                                            inputMode="decimal"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                        />
                                        <span className="text-sm text-muted-foreground">km</span>
                                    </div>
                                </div>
                            )}
                        </form.Field>

                        <BookingRequestOfferPriceConfigurationPanel
                            locale={locale}
                            viewer="admin"
                            participantsAdult={adults}
                            participantsDiscounted={discounted}
                            travelExpensesCents={travelExpensesCents}
                            guidance={liveGuidance}
                            resetKey={`${selectedCookId}:${travelExpensesCents}`}
                            disabled={isSubmitting}
                            onMenuPriceCentsChange={setMenuPriceCents}
                            onValidChange={setPriceValid}
                        />

                        <form.Field name="message">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${formId}-message`} className="text-sm font-medium">
                                        {{ de: 'Nachricht an den Gast (optional)', en: 'Message to the guest (optional)' }[locale]}
                                    </label>
                                    <p className="text-sm text-muted-foreground">
                                        {
                                            {
                                                de: 'Erscheint als erste Koch-Nachricht im Angebots-Chat.',
                                                en: 'Appears as the cook’s first message in the offer chat.',
                                            }[locale]
                                        }
                                    </p>
                                    {messageContainsPhoneNumber ? (
                                        <StatusAlert tone="warning">
                                            {
                                                {
                                                    de: 'Das Teilen von Telefonnummern ist nicht erlaubt. Bitte bleibe für Absprachen hier im Chat.',
                                                    en: 'Sharing phone numbers is not allowed. Please keep arrangements in this chat.',
                                                }[locale]
                                            }
                                        </StatusAlert>
                                    ) : null}
                                    <Textarea
                                        id={`${formId}-message`}
                                        rows={4}
                                        value={field.state.value}
                                        disabled={isSubmitting}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                        aria-invalid={messageContainsPhoneNumber || undefined}
                                    />
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="createdAt">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium">{{ de: 'Erstellt am', en: 'Created at' }[locale]}</span>
                                    <DateTimePicker
                                        value={field.state.value}
                                        onValueChange={(date) => field.handleChange(date)}
                                        placeholder={{ de: 'Datum & Uhrzeit', en: 'Date & time' }[locale]}
                                        timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                        locale={DATE_FNS_LOCALE[locale]}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </form.Field>
                        <form.Field name="paymentDateTime">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium">{{ de: 'Bezahlt am', en: 'Paid at' }[locale]}</span>
                                    <DateTimePicker
                                        value={field.state.value}
                                        onValueChange={(date) => field.handleChange(date)}
                                        placeholder={{ de: 'Datum & Uhrzeit', en: 'Date & time' }[locale]}
                                        timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                        locale={DATE_FNS_LOCALE[locale]}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </form.Field>
                        <form.Field name="plannedPayoutDateTime">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium">
                                        {{ de: 'Geplante Auszahlung', en: 'Planned payout' }[locale]}
                                    </span>
                                    <DateTimePicker
                                        value={field.state.value}
                                        onValueChange={(date) => field.handleChange(date)}
                                        placeholder={{ de: 'Datum & Uhrzeit', en: 'Date & time' }[locale]}
                                        timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                        locale={DATE_FNS_LOCALE[locale]}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </form.Field>
                        <form.Field name="payoutDateTime">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium">{{ de: 'Ausgezahlt am', en: 'Paid out at' }[locale]}</span>
                                    <DateTimePicker
                                        value={field.state.value}
                                        onValueChange={(date) => field.handleChange(date)}
                                        placeholder={{ de: 'Datum & Uhrzeit', en: 'Date & time' }[locale]}
                                        timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                        locale={DATE_FNS_LOCALE[locale]}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="notifyCustomer">
                            {(field) => (
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={field.state.value}
                                        onCheckedChange={(checked) => field.handleChange(checked === true)}
                                    />
                                    {{ de: 'Kunde benachrichtigen', en: 'Notify customer' }[locale]}
                                </label>
                            )}
                        </form.Field>

                        <div className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={isSubmitting || !priceValid || messageContainsPhoneNumber}>
                                {{ de: isSubmitting ? 'Wird angelegt…' : 'Anlegen', en: isSubmitting ? 'Creating…' : 'Create' }[locale]}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link to="/{-$locale}/admin/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Link>
                            </Button>
                        </div>
                    </form>
                )}
            </main>
        </AdminPageChrome>
    );
}
