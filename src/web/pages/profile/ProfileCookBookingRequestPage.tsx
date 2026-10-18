import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { cookBookingRequestOfferFunnelArea, formatCountryName, formatCurrency } from '../../../shared';
import { Button } from '../../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { CookBookingRequestPoolUnavailable } from '../../components/CookBookingRequestPoolUnavailable';
import type { CookBookingRequestPoolUnavailableKind } from '../../components/CookBookingRequestPoolUnavailable';
import { CookBookingRequestSummaryCard } from '../../components/CookBookingRequestSummaryCard';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookBookingRequestPageQuery } from '../../graphql/generated';
import {
    CookBookingRequestOfferFunnelTrackDocument,
    ProfileCookBookingRequestPageUpdatesDocument,
    ProfileCookBookingRequestPoolDeclineDocument,
    ProfileCookBookingRequestPoolOpenDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import type { Locale } from '../../utils/locale';
import { cookStubRouteBySlug } from './cookCatalog';

function isPoolUnavailableKind(typename: string | undefined): typename is CookBookingRequestPoolUnavailableKind {
    return (
        typename === 'CookBookingRequestCanceled' ||
        typename === 'CookBookingRequestTaken' ||
        typename === 'CookBookingRequestExpired' ||
        typename === 'CookBookingRequestOfferAlreadyExists'
    );
}

const poolRoute = cookStubRouteBySlug('booking-request-pool');

export const profileCookBookingRequestPageTitle = {
    de: 'Buchungsanfrage aus dem Pool',
    en: 'Booking request from the pool',
} as const;
export const profileCookBookingRequestPageDescription = {
    de: 'Anfrage prüfen, ablehnen oder ein Angebot erstellen.',
    en: 'Review the request, decline it, or create an offer.',
} as const;

const DECLINE_REASONS: Record<Locale, string[]> = {
    de: [
        'Zu weit weg',
        'Am gewünschten Datum nicht verfügbar',
        'Anfrage zu kurzfristig',
        'Budget passt nicht',
        'Gruppengröße passt nicht',
        'Unzureichende Informationen',
        'Nicht mein Spezialgebiet / Stil',
        'Menüanforderungen nicht umsetzbar',
        'Küchenausstattung unzureichend',
        'Anfrage wirkt unklar / unseriös',
    ],
    en: [
        'Too far away',
        'Not available on the requested date',
        'Request made too short notice',
        'Budget does not match',
        'Group size does not fit',
        'Insufficient information',
        'Not within my specialty / style',
        'Menu requirements not feasible',
        'Insufficient kitchen equipment',
        'Request appears unclear / unreliable',
    ],
};

export function ProfileCookBookingRequestPage({
    data,
    bookingRequestId,
}: {
    data: GqlCProfileCookBookingRequestPageQuery;
    bookingRequestId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const seedCook = seedUser?.cook ?? null;
    const seedLookup = seedCook?.bookingRequestLookup ?? null;
    if (!seedCook || seedLookup == null || seedLookup.__typename === 'CookBookingRequestNotFound') {
        throw notFound();
    }

    const user = useUserUpdatesSeed(seedUser, ProfileCookBookingRequestPageUpdatesDocument, { bookingRequestId });
    const cook = user?.cook ?? null;
    const lookup = cook?.bookingRequestLookup ?? null;
    const request = lookup?.__typename === 'CookBookingRequestAvailable' ? lookup.bookingRequest : null;

    const [, openRequest] = useMutation(ProfileCookBookingRequestPoolOpenDocument);
    const [, declineRequest] = useMutation(ProfileCookBookingRequestPoolDeclineDocument);
    const [, trackFunnelInteraction] = useMutation(CookBookingRequestOfferFunnelTrackDocument);

    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [declining, setDeclining] = useState(false);
    const openedRef = useRef(false);
    const declinedRef = useRef(false);
    const declineReasonId = useId();

    const trackOfferCreateStarted = useEffectEvent(() => {
        void trackFunnelInteraction({
            input: {
                webPageKey: 'PROFILE',
                area: cookBookingRequestOfferFunnelArea,
                bookingRequestId,
                interaction: { type: 'step_entered', step: 'offer_create' },
            },
        });
    });

    useEffect(() => {
        if (request == null) return;
        if (openedRef.current) return;
        if (request.cookPoolDetails?.firstOpenedAt != null) {
            openedRef.current = true;
            return;
        }
        openedRef.current = true;
        void openRequest({ bookingRequestId });
    }, [bookingRequestId, openRequest, request]);

    if (cook == null || lookup == null) {
        return null;
    }

    if (lookup.__typename === 'CookBookingRequestNotFound') {
        throw notFound();
    }

    if (isPoolUnavailableKind(lookup.__typename)) {
        if (declinedRef.current || declining) {
            return null;
        }
        return (
            <CookBookingRequestPoolUnavailable
                kind={lookup.__typename}
                locale={locale}
                bookingRequestOfferId={
                    lookup.__typename === 'CookBookingRequestOfferAlreadyExists' ? lookup.bookingRequestOfferId : undefined
                }
            />
        );
    }

    if (request == null) {
        return null;
    }

    const isDeclined = request.cookPoolDetails?.declinedAt != null;
    const stripeReady = cook.stripeStatus === 'COMPLETED' && cook.canCreateOffers;
    const hasTravelOrigin = cook.exactTravelOriginAddress != null;
    const remainingOpenAfterThis = cook.openBookingRequests.filter((open) => open.bookingRequestId !== bookingRequestId).length;

    function tryOpenOfferCreate() {
        if (!stripeReady) {
            toast.error(
                {
                    de: 'Bitte richte zuerst deine Auszahlungen in der Wallet ein.',
                    en: 'Please set up payouts in your wallet first.',
                }[locale],
            );
            return;
        }
        if (!hasTravelOrigin) {
            toast.error(
                {
                    de: 'Bitte hinterlege zuerst deinen Reise-Startort unter Reise.',
                    en: 'Please set your travel origin under Travel first.',
                }[locale],
            );
            return;
        }
        trackOfferCreateStarted();
        void navigate({
            to: '/{-$locale}/profile/booking-request-pool/$bookingRequestId/create',
            params: { bookingRequestId },
        });
    }

    async function onDecline() {
        const reason = declineReason.trim();
        if (reason.length === 0) {
            toast.error(
                {
                    de: 'Bitte gib einen Grund an.',
                    en: 'Please provide a reason.',
                }[locale],
            );
            return;
        }
        setDeclining(true);
        try {
            const result = await declineRequest({ bookingRequestId, reason });
            if (result.error || !result.data?.user.cook.bookingRequestDecline.success) {
                throw new Error('decline failed');
            }
            declinedRef.current = true;
            toast.success({ de: 'Anfrage ausgeblendet.', en: 'Request hidden.' }[locale]);
            setDeclineOpen(false);
            // More open requests → keep reviewing the pool; last one → declined tab (not an empty open pool).
            if (remainingOpenAfterThis > 0) {
                await navigate({ to: poolRoute.to });
            } else {
                await navigate({ to: poolRoute.to, search: { view: 'declined' } });
            }
        } catch {
            toast.error({ de: 'Ausblenden fehlgeschlagen.', en: 'Could not hide the request.' }[locale]);
        } finally {
            setDeclining(false);
        }
    }

    const message = request.message.trim();
    const eventLocationCityLine = [request.exactEventAddress.postCode, request.exactEventAddress.city]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ');
    const eventLocation = [eventLocationCityLine, formatCountryName(request.exactEventAddress.country, { locale })]
        .filter(Boolean)
        .join(', ');

    return (
        <>
            <ProfilePinnedFooterLayout
                className="@container"
                contentClassName="grid content-start gap-6"
                footer={
                    !isDeclined ? (
                        <div className="grid w-full gap-3 @md:grid-cols-[minmax(0,1fr)_auto] @md:items-center">
                            <p className="text-sm font-semibold text-foreground">
                                {{ de: 'Verdiene ca.', en: 'Make about' }[locale]}{' '}
                                {formatCurrency(request.estimatedCookPayoutCents, { locale })}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button type="button" variant="outline" className="w-full" onClick={() => setDeclineOpen(true)}>
                                    {{ de: 'Nicht interessiert?', en: 'Not interested?' }[locale]}
                                </Button>
                                <Button
                                    type="button"
                                    className="w-full"
                                    disabled={!stripeReady || !hasTravelOrigin}
                                    onClick={tryOpenOfferCreate}
                                >
                                    {{ de: 'Angebot machen', en: 'Make offer' }[locale]}
                                </Button>
                            </div>
                        </div>
                    ) : undefined
                }
            >
                <StatusAlert tone="info" title={{ de: 'Was ist zu tun?', en: 'What to do?' }[locale]}>
                    <ul className="list-disc space-y-1 pl-4">
                        <li>
                            {
                                {
                                    de: 'Erstelle ein Angebot mit optionalen Menüs und einem Preis.',
                                    en: 'Create an offer with optional menus and a price.',
                                }[locale]
                            }
                        </li>
                        <li>
                            {
                                {
                                    de: 'Der Kunde prüft dein Angebot. Bei Annahme könnt ihr Details klären.',
                                    en: 'The customer reviews your offer. If they accept, you can discuss details.',
                                }[locale]
                            }
                        </li>
                    </ul>
                </StatusAlert>

                {!stripeReady ? (
                    <StatusAlert
                        tone="warning"
                        title={{ de: 'Auszahlungen einrichten', en: 'Set up payouts' }[locale]}
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to="/{-$locale}/profile/wallet">{{ de: 'Zur Wallet', en: 'Go to wallet' }[locale]}</Link>
                            </Button>
                        }
                    >
                        {
                            {
                                de: 'Bevor du Angebote erstellen kannst, musst du deine Stripe-Auszahlungen abschließen.',
                                en: 'Before you can create offers, finish setting up Stripe payouts.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : null}

                {stripeReady && !hasTravelOrigin ? (
                    <StatusAlert
                        tone="warning"
                        title={{ de: 'Reise-Startort fehlt', en: 'Travel origin missing' }[locale]}
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to="/{-$locale}/profile/travel">{{ de: 'Zur Reise', en: 'Go to travel' }[locale]}</Link>
                            </Button>
                        }
                    >
                        {
                            {
                                de: 'Für Reisekosten und Distanz brauchst du einen hinterlegten Startort.',
                                en: 'A travel origin is required for distance and travel expenses.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : null}

                {isDeclined ? (
                    <StatusAlert tone="error" title={{ de: 'Von dir ausgeblendet', en: 'Hidden by you' }[locale]}>
                        {request.cookPoolDetails?.declinationReason ?? null}
                    </StatusAlert>
                ) : null}

                <CookBookingRequestSummaryCard
                    locale={locale}
                    timeZone={timeZone}
                    occasion={request.occasion}
                    dateTime={request.dateTime}
                    participants={request.participants}
                    preferences={request.preferences}
                    eventLocation={eventLocation}
                    eventLocationHint={
                        {
                            de: 'Die genaue Adresse wird nach gemeinsamer Zusage freigegeben. Für die Reisekosten nutzen wir sie bereits.',
                            en: 'The exact address is shared after both sides accept. We already use it for travel expense calculations.',
                        }[locale]
                    }
                    estimatedTravelDistanceKm={request.estimatedTravelDistanceKm}
                    estimatedTravelExpensesCents={request.estimatedTravelExpensesCents}
                    message={
                        message.length > 0
                            ? {
                                  text: message,
                                  userDisplay: request.user.display,
                                  profilePictureUrl: request.user.profilePicture?.url,
                              }
                            : null
                    }
                />
            </ProfilePinnedFooterLayout>

            <Dialog open={declineOpen} onOpenChange={(open) => !declining && setDeclineOpen(open)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {{ de: 'Kein Interesse an Buchungsanfrage', en: 'Not interested in booking request' }[locale]}
                        </DialogTitle>
                        <DialogDescription>
                            {
                                {
                                    de: 'Hilf uns, unseren Service zu verbessern, und sag uns kurz, warum diese Anfrage für dich nicht interessant war.',
                                    en: 'Help us improve by briefly telling us why this request wasn’t interesting for you.',
                                }[locale]
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3">
                        <label htmlFor={declineReasonId} className="text-sm font-medium">
                            {{ de: 'Grund', en: 'Reason' }[locale]}
                        </label>
                        <Textarea
                            id={declineReasonId}
                            rows={3}
                            value={declineReason}
                            onChange={(event) => setDeclineReason(event.target.value)}
                            placeholder={
                                {
                                    de: 'Wähle einen Vorschlag oder beschreibe den Grund.',
                                    en: 'Choose a suggestion or describe the reason.',
                                }[locale]
                            }
                        />
                        <div className="flex flex-wrap gap-2">
                            {DECLINE_REASONS[locale].map((reason) => (
                                <button
                                    key={reason}
                                    type="button"
                                    className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
                                    onClick={() => setDeclineReason(reason)}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={declining} onClick={() => setDeclineOpen(false)}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                        </Button>
                        <Button type="button" disabled={declining} onClick={() => void onDecline()}>
                            {
                                {
                                    de: declining ? 'Wird ausgeblendet…' : 'Anfrage ausblenden',
                                    en: declining ? 'Hiding…' : 'Hide request',
                                }[locale]
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
