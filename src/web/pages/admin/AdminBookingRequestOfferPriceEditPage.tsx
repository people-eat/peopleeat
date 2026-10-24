import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import {
    bookingRequestOfferPriceCalculate,
    bookingRequestOfferPriceGuidance,
    bookingRequestPaidParticipants,
    centsToEuros,
    userDisplayName,
} from '../../../shared';
import { AdminBookingRequestOfferAmendmentConfirmDialog } from '../../components/AdminBookingRequestOfferAmendmentConfirmDialog';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { DateTimePicker } from '../../components/base/date-time-picker';
import { Input } from '../../components/base/input';
import { StatusAlert } from '../../components/base/status-alert';
import { BookingRequestOfferParticipantAmendmentAdminPendingAlert } from '../../components/BookingRequestOfferParticipantAmendmentPanel';
import { BookingRequestOfferPriceConfigurationPanel } from '../../components/BookingRequestOfferPriceConfigurationPanel';
import type {
    GqlCAdminBookingRequestOfferPriceEditPageOfferFragment,
    GqlCAdminBookingRequestOfferPriceEditPageQuery,
} from '../../graphql/generated';
import {
    AdminBookingRequestOfferAmendmentApplyDocument,
    AdminBookingRequestOfferAmendmentCreateDocument,
    AdminBookingRequestOfferUpdateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { defaultAdminOfferFeePercentFormValues, parseAdminOfferPriceInputs } from './adminBookingRequestOfferFeeForm';
import type { AdminOfferPriceInputFormValues } from './adminBookingRequestOfferFeeForm';
import { AdminBookingRequestOfferFeePreview } from './AdminBookingRequestOfferFeePreview';
import { adminStubRouteBySlug } from './adminCatalog';

const AMENDMENT_PAYMENT_STATUSES = new Set(['EMPTY', 'SETUP', 'PAYED']);

function adminDualAcceptPriceEditBlockMessage(
    offer: GqlCAdminBookingRequestOfferPriceEditPageOfferFragment,
    locale: Locale,
): string | null {
    if (!(offer.userAccepted === true && offer.cookAccepted === true)) return null;
    if (offer.preparationsCompletedAt != null) {
        return {
            de: 'Vorbereitung ist gesperrt. Hebe die Sperre auf dem Angebots-Tab auf, dann erneut speichern.',
            en: 'Preparations are locked. Clear the lock on the Offer tab, then save again.',
        }[locale];
    }
    if (!AMENDMENT_PAYMENT_STATUSES.has(offer.paymentStatus)) {
        return {
            de: `Zahlungsstatus ${offer.paymentStatus} erlaubt keine Preisänderung (nur EMPTY, SETUP oder PAYED).`,
            en: `Payment status ${offer.paymentStatus} does not allow price changes (only EMPTY, SETUP, or PAYED).`,
        }[locale];
    }
    return null;
}

const listRoute = adminStubRouteBySlug('booking-requests');

export const adminBookingRequestOfferPriceEditPageTitle = { de: 'Preis bearbeiten', en: 'Edit price' } as const;
export const adminBookingRequestOfferPriceEditPageDescription = {
    de: 'Menüpreis, Reisekosten und Plattformgebühren (%) anpassen. Beträge werden live neu berechnet.',
    en: 'Edit menu price, travel expenses, and platform fee percentages. Amounts recalculate live.',
} as const;

export function adminBookingRequestOfferPriceEditPageVariables(bookingRequestId: string, bookingRequestOfferId: string) {
    return { bookingRequestId, bookingRequestOfferId };
}

type FormValues = AdminOfferPriceInputFormValues & {
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

function formFromOffer(offer: GqlCAdminBookingRequestOfferPriceEditPageOfferFragment): FormValues {
    return {
        paymentDateTime: offer.paymentDateTime ? new Date(offer.paymentDateTime) : undefined,
        plannedPayoutDateTime: offer.plannedPayoutDateTime ? new Date(offer.plannedPayoutDateTime) : undefined,
        payoutDateTime: offer.payoutDateTime ? new Date(offer.payoutDateTime) : undefined,
        travelExpensesEuros: centsToEuros(offer.travelExpensesCents),
        travelDistanceKm: offer.travelDistanceKm != null ? String(offer.travelDistanceKm) : '',
        ...defaultAdminOfferFeePercentFormValues({
            platformFeePercentCook: offer.platformFeePercentCook,
            platformFeePercentCustomer: offer.platformFeePercentCustomer,
        }),
    };
}

export function AdminBookingRequestOfferPriceEditPage({
    data,
    bookingRequestId,
    bookingRequestOfferId,
}: {
    data: GqlCAdminBookingRequestOfferPriceEditPageQuery;
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

    const dualAccepted = seedOffer.userAccepted === true && seedOffer.cookAccepted === true;
    const dualAcceptBlockMessage = dualAccepted ? adminDualAcceptPriceEditBlockMessage(seedOffer, locale) : null;
    const { adults, discounted } = participantCounts(seedRequest.participants);
    const paidParticipants = bookingRequestPaidParticipants(adults, discounted);
    const initialPricePerPersonCents =
        paidParticipants > 0 ? Math.round(seedOffer.menuPriceCents / paidParticipants) : seedRequest.suggestedOfferAmountCents;

    const [, updateOffer] = useMutation(AdminBookingRequestOfferUpdateDocument);
    const [, amendmentCreate] = useMutation(AdminBookingRequestOfferAmendmentCreateDocument);
    const [, amendmentApply] = useMutation(AdminBookingRequestOfferAmendmentApplyDocument);
    const [menuPriceCents, setMenuPriceCents] = useState(seedOffer.menuPriceCents);
    const [priceValid, setPriceValid] = useState(true);
    const [travelExpensesCents, setTravelExpensesCents] = useState(seedOffer.travelExpensesCents);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [pendingPriceInput, setPendingPriceInput] = useState<{
        menuPriceCents: number;
        travelExpensesCents: number;
        travelDistanceKm: number | null;
        platformFeePercentCook: number;
        platformFeePercentCustomer: number;
        paymentDateTime: string | null;
        plannedPayoutDateTime: string | null;
        payoutDateTime: string | null;
        priceChanged: boolean;
    } | null>(null);

    async function navigateBackToCosts() {
        await navigate({
            to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
            params: { bookingRequestId, bookingRequestOfferId },
            search: { tab: 'costs' },
        });
    }

    async function persistTimestamps(input: {
        paymentDateTime: string | null;
        plannedPayoutDateTime: string | null;
        payoutDateTime: string | null;
    }) {
        const result = await updateOffer({
            bookingRequestOfferId,
            input,
        });
        if (!result.data?.admin.bookingRequestOfferUpdate.success) {
            throw new Error('timestamp update failed');
        }
    }

    async function applyConfirmedAmendment(bypassCookApproval: boolean) {
        if (!pendingPriceInput) return;
        setConfirmBusy(true);
        try {
            const amendmentInput = {
                menuPriceCents: pendingPriceInput.menuPriceCents,
                travelExpensesCents: pendingPriceInput.travelExpensesCents,
                travelDistanceKm: pendingPriceInput.travelDistanceKm,
                platformFeePercentCook: pendingPriceInput.platformFeePercentCook,
                platformFeePercentCustomer: pendingPriceInput.platformFeePercentCustomer,
            };
            if (bypassCookApproval) {
                const result = await amendmentApply({ bookingRequestOfferId, input: amendmentInput });
                if (result.error) throw result.error;
                if (!result.data?.admin.bookingRequestOfferAmendmentApply.success) {
                    throw new Error('amendment failed');
                }
            } else {
                const result = await amendmentCreate({ bookingRequestOfferId, input: amendmentInput });
                if (result.error) throw result.error;
                if (!result.data?.admin.bookingRequestOfferAmendmentCreate.success) {
                    throw new Error('amendment failed');
                }
            }

            await persistTimestamps({
                paymentDateTime: pendingPriceInput.paymentDateTime,
                plannedPayoutDateTime: pendingPriceInput.plannedPayoutDateTime,
                payoutDateTime: pendingPriceInput.payoutDateTime,
            });

            toast.success(
                bypassCookApproval
                    ? { de: 'Preis angewendet.', en: 'Price applied.' }[locale]
                    : { de: 'Preisänderung dem Koch vorgeschlagen.', en: 'Price change proposed to the chef.' }[locale],
            );
            setConfirmOpen(false);
            await navigateBackToCosts();
        } catch (error) {
            const message = error instanceof Error ? error.message : null;
            toast.error(
                message && !message.includes('amendment failed')
                    ? message
                    : { de: 'Aktualisierung fehlgeschlagen.', en: 'Update failed.' }[locale],
            );
        } finally {
            setConfirmBusy(false);
        }
    }

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

            const priceChanged =
                fees.menuPriceCents !== seedOffer.menuPriceCents ||
                fees.travelExpensesCents !== seedOffer.travelExpensesCents ||
                fees.platformFeePercentCook !== seedOffer.platformFeePercentCook ||
                fees.platformFeePercentCustomer !== seedOffer.platformFeePercentCustomer;
            const timestampInput = {
                paymentDateTime: value.paymentDateTime?.toISOString() ?? null,
                plannedPayoutDateTime: value.plannedPayoutDateTime?.toISOString() ?? null,
                payoutDateTime: value.payoutDateTime?.toISOString() ?? null,
            };

            if (dualAccepted && priceChanged) {
                const blockMessage = adminDualAcceptPriceEditBlockMessage(seedOffer, locale);
                if (blockMessage) {
                    toast.error(blockMessage);
                    return;
                }
                setPendingPriceInput({
                    menuPriceCents: fees.menuPriceCents,
                    travelExpensesCents: fees.travelExpensesCents,
                    travelDistanceKm: fees.travelDistanceKm,
                    platformFeePercentCook: fees.platformFeePercentCook,
                    platformFeePercentCustomer: fees.platformFeePercentCustomer,
                    ...timestampInput,
                    priceChanged: true,
                });
                setConfirmOpen(true);
                return;
            }

            try {
                const result = await updateOffer({
                    bookingRequestOfferId,
                    input: {
                        ...(priceChanged
                            ? {
                                  menuPriceCents: fees.menuPriceCents,
                                  travelExpensesCents: fees.travelExpensesCents,
                                  travelDistanceKm: fees.travelDistanceKm,
                                  platformFeePercentCook: fees.platformFeePercentCook,
                                  platformFeePercentCustomer: fees.platformFeePercentCustomer,
                              }
                            : { travelDistanceKm: fees.travelDistanceKm }),
                        ...timestampInput,
                    },
                });
                if (!result.data?.admin.bookingRequestOfferUpdate.success) {
                    throw new Error('update failed');
                }
                toast.success({ de: 'Preis aktualisiert.', en: 'Price updated.' }[locale]);
                await navigateBackToCosts();
            } catch {
                toast.error({ de: 'Aktualisierung fehlgeschlagen.', en: 'Update failed.' }[locale]);
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const platformFeePercentCookRaw = useSelector(form.store, (state) => state.values.platformFeePercentCook);
    const platformFeePercentCustomerRaw = useSelector(form.store, (state) => state.values.platformFeePercentCustomer);

    const liveGuidance = bookingRequestOfferPriceGuidance({
        priceClassType: seedRequest.priceClassType,
        participantsAdult: adults,
        participantsDiscounted: discounted,
        estimatedTravelExpensesCents: travelExpensesCents,
        promoMinimumTotalAmountCustomerCents: seedRequest.minOfferAmountHardCents,
    });

    const previewPlatformFeePercentCook = Number.parseInt(platformFeePercentCookRaw, 10);
    const previewPlatformFeePercentCustomer = Number.parseInt(platformFeePercentCustomerRaw, 10);
    const previewPrice = bookingRequestOfferPriceCalculate({
        menuPriceCents,
        travelExpensesCents,
        platformFeePercentCook: Number.isInteger(previewPlatformFeePercentCook)
            ? previewPlatformFeePercentCook
            : seedOffer.platformFeePercentCook,
        platformFeePercentCustomer: Number.isInteger(previewPlatformFeePercentCustomer)
            ? previewPlatformFeePercentCustomer
            : seedOffer.platformFeePercentCustomer,
    });
    const discountCents = Math.max(
        0,
        seedOffer.totalWithoutDiscountsCentsCustomer - (seedOffer.totalCentsCustomer ?? seedOffer.totalWithoutDiscountsCentsCustomer),
    );
    const totalCentsCustomerAfter = Math.max(0, previewPrice.totalWithoutDiscountsCentsCustomer - discountCents);

    return (
        <AdminPageChrome
            crumbs={[
                { label: listRoute.title[locale], to: '/{-$locale}/admin/booking-requests' },
                {
                    label: seedRequest.occasion.trim() || { de: 'Anfrage', en: 'Request' }[locale],
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                    params: { bookingRequestId },
                },
                { label: adminBookingRequestOfferPriceEditPageTitle[locale] },
            ]}
        >
            <AdminPinnedFooterLayout
                contentClassName="grid w-full content-start gap-8"
                footer={
                    <>
                        <Button type="button" variant="outline" disabled={isSubmitting || confirmBusy} asChild>
                            <Link
                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                params={{ bookingRequestId, bookingRequestOfferId }}
                                search={{ tab: 'costs' }}
                            >
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            form="admin-booking-request-offer-price-edit-form"
                            disabled={isSubmitting || confirmBusy || !priceValid}
                        >
                            {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    </>
                }
            >
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl/tight text-foreground">{adminBookingRequestOfferPriceEditPageTitle[locale]}</h1>
                    <p className="text-sm text-muted-foreground">
                        {userDisplayName(seedOffer.cook.user)} · {adminBookingRequestOfferPriceEditPageDescription[locale]}
                    </p>
                </div>

                {dualAcceptBlockMessage ? (
                    <StatusAlert tone="warning" title={{ de: 'Preisänderung blockiert', en: 'Price edit blocked' }[locale]}>
                        {dualAcceptBlockMessage}
                    </StatusAlert>
                ) : null}
                {dualAccepted && seedOffer.participantAmendment != null && dualAcceptBlockMessage == null ? (
                    <BookingRequestOfferParticipantAmendmentAdminPendingAlert
                        locale={locale}
                        amendment={seedOffer.participantAmendment}
                        footnote={
                            {
                                de: 'Speichern ersetzt diesen Vorschlag oder wendet ihn im Bestätigungsdialog sofort an.',
                                en: 'Saving replaces this proposal, or applies it immediately from the confirm dialog.',
                            }[locale]
                        }
                    />
                ) : null}

                <form
                    id="admin-booking-request-offer-price-edit-form"
                    className="grid max-w-xl gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
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
                                        className="w-auto min-w-0 flex-1"
                                        inputMode="decimal"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                    />
                                    <span className="shrink-0 text-sm whitespace-nowrap text-muted-foreground">km</span>
                                </div>
                            </div>
                        )}
                    </form.Field>

                    <div className="grid gap-4 @md:grid-cols-2">
                        <form.Field name="platformFeePercentCook">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${formId}-fee-cook`} className="text-sm font-medium">
                                        {{ de: 'Plattformgebühr Koch (%)', en: 'Platform fee cook (%)' }[locale]}
                                    </label>
                                    <Input
                                        id={`${formId}-fee-cook`}
                                        inputMode="numeric"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                    />
                                </div>
                            )}
                        </form.Field>
                        <form.Field name="platformFeePercentCustomer">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${formId}-fee-customer`} className="text-sm font-medium">
                                        {{ de: 'Plattformgebühr Kunde (%)', en: 'Platform fee customer (%)' }[locale]}
                                    </label>
                                    <Input
                                        id={`${formId}-fee-customer`}
                                        inputMode="numeric"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                    />
                                </div>
                            )}
                        </form.Field>
                    </div>

                    <BookingRequestOfferPriceConfigurationPanel
                        locale={locale}
                        viewer="admin"
                        participantsAdult={adults}
                        participantsDiscounted={discounted}
                        travelExpensesCents={travelExpensesCents}
                        guidance={liveGuidance}
                        resetKey={`${bookingRequestOfferId}:${travelExpensesCents}`}
                        initialPricePerPersonCents={initialPricePerPersonCents}
                        disabled={isSubmitting || confirmBusy}
                        onMenuPriceCentsChange={setMenuPriceCents}
                        onValidChange={setPriceValid}
                        platformFeePercentCook={
                            Number.isInteger(previewPlatformFeePercentCook)
                                ? previewPlatformFeePercentCook
                                : seedOffer.platformFeePercentCook
                        }
                        platformFeePercentCustomer={
                            Number.isInteger(previewPlatformFeePercentCustomer)
                                ? previewPlatformFeePercentCustomer
                                : seedOffer.platformFeePercentCustomer
                        }
                    />

                    <AdminBookingRequestOfferFeePreview
                        locale={locale}
                        menuPriceCents={menuPriceCents}
                        travelExpensesCents={travelExpensesCents}
                        platformFeePercentCookRaw={platformFeePercentCookRaw}
                        platformFeePercentCustomerRaw={platformFeePercentCustomerRaw}
                        discountCents={discountCents}
                        baseline={{
                            platformFeePercentCook: seedOffer.platformFeePercentCook,
                            platformFeePercentCustomer: seedOffer.platformFeePercentCustomer,
                            platformFeeCentsCook: seedOffer.platformFeeCentsCook,
                            platformFeeCentsCustomer: seedOffer.platformFeeCentsCustomer,
                            paymentProviderFeeCents: seedOffer.paymentProviderFeeCents,
                            payoutCentsCook: seedOffer.payoutCentsCook,
                            totalWithoutDiscountsCentsCustomer: seedOffer.totalWithoutDiscountsCentsCustomer,
                            totalCentsCustomer: seedOffer.totalCentsCustomer ?? null,
                        }}
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
                                    <div className="flex justify-end">
                                        <Button type="button" size="sm" variant="outline" onClick={() => field.handleChange(undefined)}>
                                            {{ de: 'Zurücksetzen', en: 'Reset' }[locale]}
                                        </Button>
                                    </div>
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
                                    <div className="flex justify-end">
                                        <Button type="button" size="sm" variant="outline" onClick={() => field.handleChange(undefined)}>
                                            {{ de: 'Zurücksetzen', en: 'Reset' }[locale]}
                                        </Button>
                                    </div>
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
                                    <div className="flex justify-end">
                                        <Button type="button" size="sm" variant="outline" onClick={() => field.handleChange(undefined)}>
                                            {{ de: 'Zurücksetzen', en: 'Reset' }[locale]}
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </form.Field>
                </form>
            </AdminPinnedFooterLayout>

            <AdminBookingRequestOfferAmendmentConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                locale={locale}
                paymentStatus={seedOffer.paymentStatus}
                totalCentsCustomerBefore={seedOffer.totalCentsCustomer ?? seedOffer.totalWithoutDiscountsCentsCustomer}
                totalCentsCustomerAfter={totalCentsCustomerAfter}
                payoutCentsCookBefore={seedOffer.payoutCentsCook}
                payoutCentsCookAfter={previewPrice.payoutCentsCook}
                busy={confirmBusy}
                onConfirm={(bypassCookApproval) => void applyConfirmedAmendment(bypassCookApproval)}
            />
        </AdminPageChrome>
    );
}
