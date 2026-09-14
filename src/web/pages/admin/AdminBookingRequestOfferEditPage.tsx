import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { bookingRequestOfferPriceGuidance, bookingRequestPaidParticipants, centsToEuros, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { BookingRequestOfferPriceConfigurationPanel } from '../../components/BookingRequestOfferPriceConfigurationPanel';
import type { GqlCAdminBookingRequestOfferEditPageOfferFragment, GqlCAdminBookingRequestOfferEditPageQuery } from '../../graphql/generated';
import { AdminBookingRequestOfferUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import {
    acceptTriadFromBool,
    acceptTriadToBool,
    ADMIN_OFFER_ACCEPT_OPTIONS,
    parseAdminOfferPriceInputs,
} from './adminBookingRequestOfferFeeForm';
import type { AdminOfferAcceptTriad, AdminOfferPriceInputFormValues } from './adminBookingRequestOfferFeeForm';
import { adminStubRouteBySlug } from './adminCatalog';

const listRoute = adminStubRouteBySlug('booking-requests');

export const adminBookingRequestOfferEditPageTitle = { de: 'Angebot bearbeiten', en: 'Edit offer' } as const;
export const adminBookingRequestOfferEditPageDescription = {
    de: 'Annahme-Flags, Menüpreis und Reisekosten anpassen. Gebühren werden neu berechnet.',
    en: 'Edit accept flags, menu price, and travel expenses. Fees are recalculated.',
} as const;

export function adminBookingRequestOfferEditPageVariables(bookingRequestId: string, bookingRequestOfferId: string) {
    return { bookingRequestId, bookingRequestOfferId };
}

type FormValues = AdminOfferPriceInputFormValues & {
    userAccepted: AdminOfferAcceptTriad;
    cookAccepted: AdminOfferAcceptTriad;
    paymentDateTime: Date | undefined;
    plannedPayoutDateTime: Date | undefined;
    payoutDateTime: Date | undefined;
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

function formFromOffer(offer: GqlCAdminBookingRequestOfferEditPageOfferFragment): FormValues {
    return {
        userAccepted: acceptTriadFromBool(offer.userAccepted),
        cookAccepted: acceptTriadFromBool(offer.cookAccepted),
        paymentDateTime: offer.paymentDateTime ? new Date(offer.paymentDateTime) : undefined,
        plannedPayoutDateTime: offer.plannedPayoutDateTime ? new Date(offer.plannedPayoutDateTime) : undefined,
        payoutDateTime: offer.payoutDateTime ? new Date(offer.payoutDateTime) : undefined,
        travelExpensesEuros: centsToEuros(offer.travelExpensesCents),
        travelDistanceKm: offer.travelDistanceKm != null ? String(offer.travelDistanceKm) : '',
    };
}

export function AdminBookingRequestOfferEditPage({
    data,
    bookingRequestId,
    bookingRequestOfferId,
}: {
    data: GqlCAdminBookingRequestOfferEditPageQuery;
    bookingRequestId: string;
    bookingRequestOfferId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const formId = useId();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedOffer = seedAdmin?.bookingRequestOffer ?? null;
    const seedRequest = seedAdmin?.bookingRequest ?? null;
    if (!seedOffer || seedOffer.bookingRequestOfferId !== bookingRequestOfferId || seedOffer.bookingRequestId !== bookingRequestId) {
        throw notFound();
    }
    if (!seedRequest) throw notFound();

    const { adults, discounted } = participantCounts(seedRequest.participants);
    const paidParticipants = bookingRequestPaidParticipants(adults, discounted);
    const initialPricePerPersonCents =
        paidParticipants > 0 ? Math.round(seedOffer.menuPriceCents / paidParticipants) : seedRequest.suggestedOfferAmountCents;

    const [, updateOffer] = useMutation(AdminBookingRequestOfferUpdateDocument);
    const [menuPriceCents, setMenuPriceCents] = useState(seedOffer.menuPriceCents);
    const [priceValid, setPriceValid] = useState(true);
    const [travelExpensesCents, setTravelExpensesCents] = useState(seedOffer.travelExpensesCents);

    const form = useForm({
        defaultValues: formFromOffer(seedOffer),
        onSubmit: async ({ value }) => {
            if (!priceValid) {
                toast.error({ de: 'Bitte einen gültigen Menüpreis eingeben.', en: 'Please enter a valid menu price.' }[locale]);
                return;
            }

            const fees = parseAdminOfferPriceInputs({ ...value, menuPriceCents });
            if ('error' in fees) {
                toast.error(fees.error[locale]);
                return;
            }

            try {
                const result = await updateOffer({
                    bookingRequestOfferId,
                    input: {
                        userAccepted: acceptTriadToBool(value.userAccepted),
                        cookAccepted: acceptTriadToBool(value.cookAccepted),
                        menuPriceCents: fees.menuPriceCents,
                        travelExpensesCents: fees.travelExpensesCents,
                        travelDistanceKm: fees.travelDistanceKm,
                        paymentDateTime: value.paymentDateTime?.toISOString() ?? null,
                        plannedPayoutDateTime: value.plannedPayoutDateTime?.toISOString() ?? null,
                        payoutDateTime: value.payoutDateTime?.toISOString() ?? null,
                    },
                });
                if (!result.data?.admin.bookingRequestOfferUpdate.success) {
                    throw new Error('update failed');
                }
                toast.success({ de: 'Angebot aktualisiert.', en: 'Offer updated.' }[locale]);
                await navigate({
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                    params: { bookingRequestId, bookingRequestOfferId },
                    search: { tab: 'offer' },
                });
            } catch {
                toast.error({ de: 'Aktualisierung fehlgeschlagen.', en: 'Update failed.' }[locale]);
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

    const liveGuidance = bookingRequestOfferPriceGuidance({
        priceClassType: seedRequest.priceClassType,
        participantsAdult: adults,
        participantsDiscounted: discounted,
        estimatedTravelExpensesCents: travelExpensesCents,
        promoMinimumTotalAmountCustomerCents: seedRequest.minOfferAmountHardCents,
    });

    return (
        <AdminPageChrome
            crumbs={[
                { label: listRoute.title[locale], to: '/{-$locale}/admin/booking-requests' },
                {
                    label: seedRequest.occasion.trim() || { de: 'Anfrage', en: 'Request' }[locale],
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                    params: { bookingRequestId },
                },
                { label: adminBookingRequestOfferEditPageTitle[locale] },
            ]}
        >
            <AdminPinnedFooterLayout
                contentClassName="grid w-full content-start gap-8"
                footer={
                    <>
                        <Button type="button" variant="outline" disabled={isSubmitting} asChild>
                            <Link
                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                params={{ bookingRequestId, bookingRequestOfferId }}
                                search={{ tab: 'offer' }}
                            >
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Link>
                        </Button>
                        <Button type="submit" form="admin-booking-request-offer-edit-form" disabled={isSubmitting || !priceValid}>
                            {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    </>
                }
            >
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl/tight text-foreground">{adminBookingRequestOfferEditPageTitle[locale]}</h1>
                    <p className="text-sm text-muted-foreground">
                        {userDisplayName(seedOffer.cook.user)} · {adminBookingRequestOfferEditPageDescription[locale]}
                    </p>
                </div>

                <form
                    id="admin-booking-request-offer-edit-form"
                    className="grid max-w-xl gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <div className="grid gap-4 @md:grid-cols-2">
                        <form.Field name="cookAccepted">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium">{{ de: 'Koch akzeptiert', en: 'Cook accepted' }[locale]}</span>
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
                        resetKey={`${bookingRequestOfferId}:${travelExpensesCents}`}
                        initialPricePerPersonCents={initialPricePerPersonCents}
                        disabled={isSubmitting}
                        onMenuPriceCentsChange={setMenuPriceCents}
                        onValidChange={setPriceValid}
                    />

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
                                {field.state.value ? (
                                    <Button type="button" size="sm" variant="ghost" onClick={() => field.handleChange(undefined)}>
                                        {{ de: 'Leeren', en: 'Clear' }[locale]}
                                    </Button>
                                ) : null}
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="plannedPayoutDateTime">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <span className="text-sm font-medium">{{ de: 'Geplante Auszahlung', en: 'Planned payout' }[locale]}</span>
                                <DateTimePicker
                                    value={field.state.value}
                                    onValueChange={(date) => field.handleChange(date)}
                                    placeholder={{ de: 'Datum & Uhrzeit', en: 'Date & time' }[locale]}
                                    timeAriaLabel={{ de: 'Uhrzeit', en: 'Time' }[locale]}
                                    locale={DATE_FNS_LOCALE[locale]}
                                    className="w-full"
                                />
                                {field.state.value ? (
                                    <Button type="button" size="sm" variant="ghost" onClick={() => field.handleChange(undefined)}>
                                        {{ de: 'Leeren', en: 'Clear' }[locale]}
                                    </Button>
                                ) : null}
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
                                {field.state.value ? (
                                    <Button type="button" size="sm" variant="ghost" onClick={() => field.handleChange(undefined)}>
                                        {{ de: 'Leeren', en: 'Clear' }[locale]}
                                    </Button>
                                ) : null}
                            </div>
                        )}
                    </form.Field>
                </form>
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
