import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { cookBookingRequestOfferFunnelArea, formatCountryName, formatCurrency } from '../../../shared';
import type { Locale } from '../../../shared/locale';
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

export function profileCookBookingRequestPageTitle(locale: Locale): string {
    return t(locale, 'profileCook', 'poolRequest.title');
}
export function profileCookBookingRequestPageDescription(locale: Locale): string {
    return t(locale, 'profileCook', 'poolRequest.description');
}

const DECLINE_REASON_KEYS = [
    'tooFar',
    'notAvailable',
    'tooShortNotice',
    'budget',
    'groupSize',
    'insufficientInfo',
    'notMyStyle',
    'menuNotFeasible',
    'kitchen',
    'unclear',
] as const;

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

    const accountStatus = (user ?? seedUser)?.status;
    const accountActive = accountStatus === 'ACTIVE';

    useEffect(() => {
        if (request == null) return;
        if (openedRef.current) return;
        if (request.cookPoolDetails?.firstOpenedAt != null) {
            openedRef.current = true;
            return;
        }
        // Banned / anonymized cooks can still read the pool; cook writes require ACTIVE.
        // Skip the auto-open stamp so we do not hit guardCookMutation error noise.
        if (!accountActive) {
            openedRef.current = true;
            return;
        }
        openedRef.current = true;
        void openRequest({ bookingRequestId });
    }, [accountActive, bookingRequestId, openRequest, request]);

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
            toast.error(t(locale, 'profileCook', 'poolRequest.setupFinancesFirst'));
            return;
        }
        if (!hasTravelOrigin) {
            toast.error(t(locale, 'profileCook', 'poolRequest.setupTravelFirst'));
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
            toast.error(t(locale, 'profileCook', 'poolRequest.reasonRequired'));
            return;
        }
        setDeclining(true);
        try {
            const result = await declineRequest({ bookingRequestId, reason });
            if (result.error || !result.data?.user.cook.bookingRequestDecline.success) {
                throw new Error('decline failed');
            }
            declinedRef.current = true;
            toast.success(t(locale, 'profileCook', 'poolRequest.hidden'));
            setDeclineOpen(false);
            // More open requests → keep reviewing the pool; last one → declined tab (not an empty open pool).
            if (remainingOpenAfterThis > 0) {
                await navigate({ to: poolRoute.to });
            } else {
                await navigate({ to: poolRoute.to, search: { view: 'declined' } });
            }
        } catch {
            toast.error(t(locale, 'profileCook', 'poolRequest.hideFailed'));
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
                    !isDeclined && accountActive ? (
                        <div className="grid w-full gap-3 @md:grid-cols-[minmax(0,1fr)_auto] @md:items-center">
                            <p className="text-sm font-semibold text-foreground">
                                {t(locale, 'profileCook', 'poolRequest.makeAbout')}{' '}
                                {formatCurrency(request.estimatedCookPayoutCents, { locale })}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button type="button" variant="outline" className="w-full" onClick={() => setDeclineOpen(true)}>
                                    {t(locale, 'profileCook', 'poolRequest.notInterested')}
                                </Button>
                                <Button
                                    type="button"
                                    className="w-full"
                                    disabled={!stripeReady || !hasTravelOrigin}
                                    onClick={tryOpenOfferCreate}
                                >
                                    {t(locale, 'profileCook', 'poolRequest.makeOffer')}
                                </Button>
                            </div>
                        </div>
                    ) : undefined
                }
            >
                {request.requestedByCustomer ? (
                    <StatusAlert
                        tone="info"
                        title={
                            request.isExclusive
                                ? t(locale, 'profileCook', 'poolRequest.requestedYou')
                                : t(locale, 'profileCook', 'poolRequest.requestedYouOpen')
                        }
                    >
                        {request.requestedMenu
                            ? t(locale, 'profileCook', 'poolRequest.fromProfileMenu', {
                                  title: request.requestedMenu.title,
                              })
                            : t(locale, 'profileCook', 'poolRequest.fromProfile')}
                    </StatusAlert>
                ) : null}

                <StatusAlert tone="info" title={t(locale, 'profileCook', 'poolRequest.whatToDo')}>
                    <ul className="list-disc space-y-1 pl-4">
                        <li>{t(locale, 'profileCook', 'poolRequest.createHint')}</li>
                        <li>{t(locale, 'profileCook', 'poolRequest.customerReviews')}</li>
                    </ul>
                </StatusAlert>

                {accountActive && !stripeReady ? (
                    <StatusAlert
                        tone="warning"
                        title={t(locale, 'profileCook', 'poolRequest.setupPayouts')}
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to="/{-$locale}/profile/finances">{t(locale, 'profileCook', 'poolRequest.goToFinances')}</Link>
                            </Button>
                        }
                    >
                        {t(locale, 'profileCook', 'poolRequest.finishStripe')}
                    </StatusAlert>
                ) : null}

                {accountActive && stripeReady && !hasTravelOrigin ? (
                    <StatusAlert
                        tone="warning"
                        title={t(locale, 'profileCook', 'poolRequest.travelMissing')}
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to="/{-$locale}/profile/travel">{t(locale, 'profileCook', 'poolRequest.goToTravel')}</Link>
                            </Button>
                        }
                    >
                        {t(locale, 'profileCook', 'poolRequest.travelRequired')}
                    </StatusAlert>
                ) : null}

                {isDeclined ? (
                    <StatusAlert tone="error" title={t(locale, 'profileCook', 'poolRequest.hiddenByYou')}>
                        {request.cookPoolDetails?.declinationReason ?? null}
                    </StatusAlert>
                ) : null}

                <CookBookingRequestSummaryCard
                    locale={locale}
                    timeZone={timeZone}
                    occasion={request.occasion}
                    dateTime={request.dateTime}
                    venueCountry={request.exactEventAddress.country}
                    venueCity={request.exactEventAddress.city}
                    participants={request.participants}
                    preferences={request.preferences}
                    eventLocation={eventLocation}
                    eventLocationHint={t(locale, 'profileCook', 'offer.exactAddressHint')}
                    estimatedTravelDistanceKm={request.estimatedTravelDistanceKm}
                    estimatedTravelExpensesCents={request.estimatedTravelExpensesCents}
                    setting={request.setting}
                    kitchenDetails={request.kitchenDetails}
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
                        <DialogTitle>{t(locale, 'profileCook', 'poolRequest.declineTitle')}</DialogTitle>
                        <DialogDescription>{t(locale, 'profileCook', 'poolRequest.declineBody')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3">
                        <label htmlFor={declineReasonId} className="text-sm font-medium">
                            {t(locale, 'profileCook', 'poolRequest.reason')}
                        </label>
                        <Textarea
                            id={declineReasonId}
                            rows={3}
                            value={declineReason}
                            onChange={(event) => setDeclineReason(event.target.value)}
                            placeholder={t(locale, 'profileCook', 'poolRequest.reasonHint')}
                        />
                        <div className="flex flex-wrap gap-2">
                            {DECLINE_REASON_KEYS.map((reasonKey) => {
                                const reason = t(locale, 'profileCook', `poolRequest.declineReasons.${reasonKey}`);
                                return (
                                    <button
                                        key={reasonKey}
                                        type="button"
                                        className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
                                        onClick={() => setDeclineReason(reason)}
                                    >
                                        {reason}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={declining} onClick={() => setDeclineOpen(false)}>
                            {t(locale, 'common', 'cancel')}
                        </Button>
                        <Button type="button" disabled={declining} onClick={() => void onDecline()}>
                            {declining ? t(locale, 'profileCook', 'actions.hiding') : t(locale, 'profileCook', 'actions.hideRequest')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
