import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import type { GqlCAdminBookingRequestOfferEditPageOfferFragment, GqlCAdminBookingRequestOfferEditPageQuery } from '../../graphql/generated';
import { AdminBookingRequestOfferUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import {
    acceptTriadFromBool,
    acceptTriadToBool,
    ADMIN_OFFER_ACCEPT_OPTIONS,
    adminOfferAcceptOptionLabel,
} from './adminBookingRequestOfferFeeForm';
import type { AdminOfferAcceptTriad } from './adminBookingRequestOfferFeeForm';
import { adminStubRouteBySlug, adminStubRouteTitle } from './adminCatalog';

const listRoute = adminStubRouteBySlug('booking-requests');

export function adminBookingRequestOfferEditPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequestOfferEdit.title');
}
export function adminBookingRequestOfferEditPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequestOfferEdit.description');
}

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
                toast.success(t(locale, 'admin', 'copy.offerUpdated'));
                await navigate({
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                    params: { bookingRequestId, bookingRequestOfferId },
                    search: { tab: 'offer' },
                });
            } catch {
                toast.error(t(locale, 'admin', 'copy.updateFailed'));
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

    return (
        <AdminPageChrome
            crumbs={[
                { label: adminStubRouteTitle(listRoute.slug, locale), to: '/{-$locale}/admin/booking-requests' },
                {
                    label: seedRequest.occasion.trim() || t(locale, 'admin', 'copy.request'),
                    to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                    params: { bookingRequestId },
                },
                { label: adminBookingRequestOfferEditPageTitle(locale) },
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
                                {t(locale, 'admin', 'copy.cancel')}
                            </Link>
                        </Button>
                        <Button type="submit" form="admin-booking-request-offer-edit-form" disabled={isSubmitting}>
                            {isSubmitting ? t(locale, 'admin', 'copy.saving2') : t(locale, 'admin', 'copy.save')}
                        </Button>
                    </>
                }
            >
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl/tight text-foreground">{adminBookingRequestOfferEditPageTitle(locale)}</h1>
                    <p className="text-sm text-muted-foreground">
                        {userDisplayName(seedOffer.cook.user)} · {adminBookingRequestOfferEditPageDescription(locale)}
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
                                    <span className="text-sm font-medium">{t(locale, 'admin', 'copy.cookAccepted')}</span>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(next) => next && field.handleChange(next as AdminOfferAcceptTriad)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ADMIN_OFFER_ACCEPT_OPTIONS.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {adminOfferAcceptOptionLabel(option, locale)}
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
                                    <span className="text-sm font-medium">{t(locale, 'admin', 'copy.customerAccepted')}</span>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(next) => next && field.handleChange(next as AdminOfferAcceptTriad)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ADMIN_OFFER_ACCEPT_OPTIONS.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {adminOfferAcceptOptionLabel(option, locale)}
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
