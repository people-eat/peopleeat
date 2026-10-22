import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import type { GqlCAdminBookingRequestOfferEditPageOfferFragment, GqlCAdminBookingRequestOfferEditPageQuery } from '../../graphql/generated';
import { AdminBookingRequestOfferUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { acceptTriadFromBool, acceptTriadToBool, ADMIN_OFFER_ACCEPT_OPTIONS } from './adminBookingRequestOfferFeeForm';
import type { AdminOfferAcceptTriad } from './adminBookingRequestOfferFeeForm';
import { adminStubRouteBySlug } from './adminCatalog';

const listRoute = adminStubRouteBySlug('booking-requests');

export const adminBookingRequestOfferEditPageTitle = { de: 'Angebot bearbeiten', en: 'Edit offer' } as const;
export const adminBookingRequestOfferEditPageDescription = {
    de: 'Annahme-Flags von Kunde und Koch anpassen.',
    en: 'Edit customer and cook accept flags.',
} as const;

export function adminBookingRequestOfferEditPageVariables(bookingRequestId: string, bookingRequestOfferId: string) {
    return { bookingRequestId, bookingRequestOfferId };
}

type FormValues = {
    userAccepted: AdminOfferAcceptTriad;
    cookAccepted: AdminOfferAcceptTriad;
};

function formFromOffer(offer: GqlCAdminBookingRequestOfferEditPageOfferFragment): FormValues {
    return {
        userAccepted: acceptTriadFromBool(offer.userAccepted),
        cookAccepted: acceptTriadFromBool(offer.cookAccepted),
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
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedOffer = seedAdmin?.bookingRequestOffer ?? null;
    const seedRequest = seedAdmin?.bookingRequest ?? null;
    if (!seedOffer || seedOffer.bookingRequestOfferId !== bookingRequestOfferId || seedOffer.bookingRequestId !== bookingRequestId) {
        throw notFound();
    }
    if (!seedRequest) throw notFound();

    const [, updateOffer] = useMutation(AdminBookingRequestOfferUpdateDocument);

    const form = useForm({
        defaultValues: formFromOffer(seedOffer),
        onSubmit: async ({ value }) => {
            try {
                const result = await updateOffer({
                    bookingRequestOfferId,
                    input: {
                        userAccepted: acceptTriadToBool(value.userAccepted),
                        cookAccepted: acceptTriadToBool(value.cookAccepted),
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
                        <Button type="submit" form="admin-booking-request-offer-edit-form" disabled={isSubmitting}>
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
                </form>
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
