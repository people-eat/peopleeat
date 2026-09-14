import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { bookingRequestPaidParticipants } from '../../../shared';
import { Button } from '../../components/base/button';
import { BookingRequestOfferPriceConfigurationPanel } from '../../components/BookingRequestOfferPriceConfigurationPanel';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookBookingRequestOfferPriceEditPageQuery } from '../../graphql/generated';
import {
    ProfileCookBookingRequestOfferPriceEditPageUpdatesDocument,
    ProfileCookBookingRequestOfferPriceUpdateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';
import {
    profileCookBookingRequestOfferPriceEditPageDescription,
    profileCookBookingRequestOfferPriceEditPageTitle,
} from './profileCookBookingRequestOfferLabels';

export {
    profileCookBookingRequestOfferPriceEditPageDescription,
    profileCookBookingRequestOfferPriceEditPageTitle,
} from './profileCookBookingRequestOfferLabels';

const offersListRoute = cookStubRouteBySlug('booking-request-offers');

function canNegotiateOffer(status: string): boolean {
    return status === 'USER_NEEDS_TO_ACCEPT' || status === 'COOK_NEEDS_TO_ACCEPT';
}

export function profileCookBookingRequestOfferPriceEditPageVariables(bookingRequestOfferId: string) {
    return { bookingRequestOfferId };
}

export function ProfileCookBookingRequestOfferPriceEditPage({
    data,
    bookingRequestOfferId,
}: {
    data: GqlCProfileCookBookingRequestOfferPriceEditPageQuery;
    bookingRequestOfferId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const seedCook = seedUser?.cook ?? null;
    const seedOffer = seedCook?.bookingRequestOffer ?? null;
    if (!seedCook || !seedOffer) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCookBookingRequestOfferPriceEditPageUpdatesDocument, { bookingRequestOfferId });
    const cook = user?.cook ?? null;
    const offer = cook?.bookingRequestOffer ?? null;

    const [, updatePrice] = useMutation(ProfileCookBookingRequestOfferPriceUpdateDocument);
    const [menuPriceCents, setMenuPriceCents] = useState(seedOffer.menuPriceCents);
    const [priceValid, setPriceValid] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user == null) return;
        if (offer == null) {
            void navigate({ to: offersListRoute.to });
            return;
        }
        if (!canNegotiateOffer(offer.status)) {
            void navigate({
                to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
                params: { bookingRequestOfferId },
                search: { tab: 'offer' },
            });
        }
    }, [bookingRequestOfferId, navigate, offer, user]);

    if (cook == null || offer == null) {
        return null;
    }

    const isDirty = menuPriceCents !== offer.menuPriceCents;
    const request = offer.bookingRequest;
    const adults = request.participants.filter((participant) => participant.type === 'ADULT').length;
    const discounted = request.participants.filter((participant) => participant.type === 'DISCOUNTED').length;
    const paid = bookingRequestPaidParticipants(adults, discounted);

    async function onSave() {
        if (!priceValid || menuPriceCents <= 0 || saving) {
            toast.error({ de: 'Bitte gib einen gültigen Preis ein.', en: 'Please enter a valid price.' }[locale]);
            return;
        }
        setSaving(true);
        try {
            const result = await updatePrice({ input: { bookingRequestOfferId, menuPriceCents } });
            if (!result.data?.user.cook.bookingRequestOfferPriceUpdate.success) {
                throw new Error('price update failed');
            }
            toast.success({ de: 'Preis aktualisiert.', en: 'Price updated.' }[locale]);
            await navigate({
                to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
                params: { bookingRequestOfferId },
                search: { tab: 'offer' },
            });
        } catch {
            toast.error({ de: 'Preisupdate fehlgeschlagen.', en: 'Could not update the price.' }[locale]);
        } finally {
            setSaving(false);
        }
    }

    return (
        <ProfilePinnedFooterLayout
            className="@container"
            contentClassName="grid max-w-lg content-start gap-6"
            footer={
                isDirty ? (
                    <>
                        <Button type="button" variant="outline" disabled={saving} asChild>
                            <Link
                                to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                params={{ bookingRequestOfferId }}
                                search={{ tab: 'offer' }}
                            >
                                {{ de: 'Verwerfen', en: 'Discard' }[locale]}
                            </Link>
                        </Button>
                        <Button type="button" disabled={saving || !priceValid} onClick={() => void onSave()}>
                            {{ de: saving ? 'Wird gespeichert…' : 'Speichern', en: saving ? 'Saving…' : 'Save' }[locale]}
                        </Button>
                    </>
                ) : (
                    <Button type="button" disabled={saving} asChild>
                        <Link
                            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                            params={{ bookingRequestOfferId }}
                            search={{ tab: 'offer' }}
                        >
                            {{ de: 'Zum Angebot', en: 'Back to offer' }[locale]}
                        </Link>
                    </Button>
                )
            }
        >
            <div className="grid gap-1">
                <h1 className="font-serif text-2xl text-foreground">{profileCookBookingRequestOfferPriceEditPageTitle[locale]}</h1>
                <p className="text-sm text-muted-foreground">{profileCookBookingRequestOfferPriceEditPageDescription[locale]}</p>
            </div>

            <BookingRequestOfferPriceConfigurationPanel
                locale={locale}
                viewer="cook"
                participantsAdult={adults}
                participantsDiscounted={discounted}
                travelExpensesCents={offer.travelExpensesCents}
                guidance={{
                    suggestedOfferAmountCents: request.suggestedOfferAmountCents,
                    minOfferAmountCents: request.minOfferAmountCents ?? null,
                    maxOfferAmountCents: request.maxOfferAmountCents ?? null,
                    minOfferAmountHardCents: request.minOfferAmountHardCents ?? null,
                }}
                resetKey={offer.bookingRequestOfferId}
                initialPricePerPersonCents={paid > 0 ? Math.round(offer.menuPriceCents / paid) : request.suggestedOfferAmountCents}
                disabled={saving}
                onMenuPriceCentsChange={setMenuPriceCents}
                onValidChange={setPriceValid}
            />
        </ProfilePinnedFooterLayout>
    );
}
