import { Link, notFound, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { containsPhoneNumber, cookBookingRequestOfferFunnelArea } from '../../../shared';
import type { CookBookingRequestOfferFunnelClientStep } from '../../../shared';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { BookingRequestOfferPriceConfigurationPanel } from '../../components/BookingRequestOfferPriceConfigurationPanel';
import { CookBookingRequestPoolUnavailable } from '../../components/CookBookingRequestPoolUnavailable';
import type { CookBookingRequestPoolUnavailableKind } from '../../components/CookBookingRequestPoolUnavailable';
import { CookMenuSelectPanel, cookMenuSelectPanelMenuIsComplete } from '../../components/CookMenuSelectPanel';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookBookingRequestOfferCreatePageQuery } from '../../graphql/generated';
import {
    CookBookingRequestOfferFunnelTrackDocument,
    ProfileCookBookingRequestOfferCreatePageCreateDocument,
    ProfileCookBookingRequestOfferCreatePageGeneratedMenuApplyDocument,
    ProfileCookBookingRequestOfferCreatePageMenuEvaluationRefreshDocument,
    ProfileCookBookingRequestOfferCreatePageUpdatesDocument,
    ProfileMenuCreateDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cn } from '../../utils/cn';
import { returnToFromLocation } from '../../utils/returnTo';
import { cookStubRouteBySlug } from './cookCatalog';

import { profileCookBookingRequestOfferCreatePageTitle } from './profileCookBookingRequestOfferLabels';

const OFFER_CREATE_MESSAGE_MAX_LENGTH = 2000;

export type ProfileCookBookingRequestOfferCreateStep = 'menus' | 'price';

export type ProfileCookBookingRequestOfferCreateSearch = {
    menus?: string;
    price?: number;
    message?: string;
    step?: ProfileCookBookingRequestOfferCreateStep;
};

function offerCreateStepFromSearch(step: unknown): ProfileCookBookingRequestOfferCreateStep {
    return step === 'price' ? 'price' : 'menus';
}

export function parseProfileCookBookingRequestOfferCreateSearch(
    search: Record<string, unknown>,
): ProfileCookBookingRequestOfferCreateSearch {
    const menusRaw = typeof search.menus === 'string' ? search.menus.trim() : '';
    const menus = menusRaw.length > 0 ? menusRaw : undefined;
    const priceNum = typeof search.price === 'number' ? search.price : typeof search.price === 'string' ? Number(search.price) : NaN;
    const price = Number.isInteger(priceNum) && priceNum >= 0 ? priceNum : undefined;
    const messageRaw = typeof search.message === 'string' ? search.message.trim() : '';
    const message = messageRaw.length > 0 ? messageRaw.slice(0, OFFER_CREATE_MESSAGE_MAX_LENGTH) : undefined;
    const step = offerCreateStepFromSearch(search.step);
    return {
        menus,
        price,
        message,
        // Default menus stays out of the URL; only persist the non-default step.
        step: step === 'price' ? 'price' : undefined,
    };
}

function profileCookBookingRequestOfferCreateSearchForUrl(next: {
    menus: readonly string[];
    price: number;
    message: string;
    step: ProfileCookBookingRequestOfferCreateStep;
}): ProfileCookBookingRequestOfferCreateSearch {
    const trimmedMessage = next.message.trim().slice(0, OFFER_CREATE_MESSAGE_MAX_LENGTH);
    return {
        menus: next.menus.length > 0 ? next.menus.join(',') : undefined,
        price: next.price > 0 ? next.price : undefined,
        message: trimmedMessage.length > 0 ? trimmedMessage : undefined,
        step: next.step === 'price' ? 'price' : undefined,
    };
}

function menuIdsFromOfferCreateSearch(search: ProfileCookBookingRequestOfferCreateSearch): string[] {
    if (search.menus == null || search.menus.length === 0) return [];
    return search.menus
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
}

function offerCreateSearchEqual(a: ProfileCookBookingRequestOfferCreateSearch, b: ProfileCookBookingRequestOfferCreateSearch): boolean {
    return a.menus === b.menus && a.price === b.price && a.message === b.message && a.step === b.step;
}

function searchToSearchStr(search: ProfileCookBookingRequestOfferCreateSearch): string {
    const params = new URLSearchParams();
    if (search.menus != null) params.set('menus', search.menus);
    if (search.price != null) params.set('price', String(search.price));
    if (search.message != null) params.set('message', search.message);
    if (search.step != null) params.set('step', search.step);
    const serialized = params.toString();
    return serialized.length > 0 ? `?${serialized}` : '';
}

function isPoolUnavailableKind(typename: string | undefined): typename is CookBookingRequestPoolUnavailableKind {
    return (
        typename === 'CookBookingRequestCanceled' ||
        typename === 'CookBookingRequestTaken' ||
        typename === 'CookBookingRequestExpired' ||
        typename === 'CookBookingRequestOfferAlreadyExists'
    );
}

export {
    profileCookBookingRequestOfferCreatePageDescription,
    profileCookBookingRequestOfferCreatePageTitle,
} from './profileCookBookingRequestOfferLabels';

const poolRoute = cookStubRouteBySlug('booking-request-pool');

export function ProfileCookBookingRequestOfferCreatePage({
    data,
    bookingRequestId,
    search,
}: {
    data: GqlCProfileCookBookingRequestOfferCreatePageQuery;
    bookingRequestId: string;
    search: ProfileCookBookingRequestOfferCreateSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const location = useLocation();
    const seedUser = data.currentSession.user ?? null;
    const seedCook = seedUser?.cook ?? null;
    const seedLookup = seedCook?.bookingRequestLookup ?? null;
    if (!seedCook || seedLookup == null || seedLookup.__typename === 'CookBookingRequestNotFound') {
        throw notFound();
    }

    const user = useUserUpdatesSeed(seedUser, ProfileCookBookingRequestOfferCreatePageUpdatesDocument, { bookingRequestId });
    const cook = user?.cook ?? null;
    const lookup = cook?.bookingRequestLookup ?? null;
    const request = lookup?.__typename === 'CookBookingRequestAvailable' ? lookup.bookingRequest : null;

    const [, createOffer] = useMutation(ProfileCookBookingRequestOfferCreatePageCreateDocument);
    const [, createMenu] = useMutation(ProfileMenuCreateDocument);
    const [, refreshMenuEvaluation] = useMutation(ProfileCookBookingRequestOfferCreatePageMenuEvaluationRefreshDocument);
    const [, applyGeneratedMenu] = useMutation(ProfileCookBookingRequestOfferCreatePageGeneratedMenuApplyDocument);
    const [, trackFunnelInteraction] = useMutation(CookBookingRequestOfferFunnelTrackDocument);
    const menuEvaluationEnabled = useFeatureToggleActive('AI_MENU_EVALUATION');
    const messageFieldId = useId();

    const [priceSeedFromSearch] = useState(() => search.price);
    const [selectedMenuIds, setSelectedMenuIds] = useState(() => menuIdsFromOfferCreateSearch(search));
    const [menuPriceCents, setMenuPriceCents] = useState(() => search.price ?? 0);
    const [priceValid, setPriceValid] = useState(false);
    const [message, setMessage] = useState(() => search.message ?? '');
    const [step, setStep] = useState<ProfileCookBookingRequestOfferCreateStep>(() => {
        const fromSearch = offerCreateStepFromSearch(search.step);
        if (fromSearch === 'price' && menuIdsFromOfferCreateSearch(search).length === 0) return 'menus';
        return fromSearch;
    });
    const [creatingOffer, setCreatingOffer] = useState(false);
    const [creatingMenu, setCreatingMenu] = useState(false);
    const [refreshingEvaluation, setRefreshingEvaluation] = useState(false);
    const [applyingGeneratedMenu, setApplyingGeneratedMenu] = useState(false);
    const [recommendationApplied, setRecommendationApplied] = useState(false);
    const [menuSelectionError, setMenuSelectionError] = useState<string | null>(null);
    const submittedOfferRef = useRef(false);
    const applyingGeneratedMenuRef = useRef(false);
    const pageTopRef = useRef<HTMLDivElement>(null);
    const menusSectionRef = useRef<HTMLDivElement>(null);
    const enteredFunnelStepsRef = useRef(new Set<CookBookingRequestOfferFunnelClientStep>());
    const messageContainsPhoneNumber = containsPhoneNumber(message);

    const trackFunnelStep = useEffectEvent(
        (type: 'step_entered' | 'step_completed', funnelStep: CookBookingRequestOfferFunnelClientStep) => {
            void trackFunnelInteraction({
                input: {
                    webPageKey: 'PROFILE',
                    area: cookBookingRequestOfferFunnelArea,
                    bookingRequestId,
                    interaction: { type, step: funnelStep },
                },
            });
        },
    );

    useEffect(() => {
        if (enteredFunnelStepsRef.current.has('offer_create')) return;
        enteredFunnelStepsRef.current.add('offer_create');
        trackFunnelStep('step_entered', 'offer_create');
    }, []);

    useEffect(() => {
        if (enteredFunnelStepsRef.current.has(step)) return;
        enteredFunnelStepsRef.current.add(step);
        trackFunnelStep('step_entered', step);
    }, [step]);

    useEffect(() => {
        if (user == null || cook == null) return;
        // Offer create flips lookup to OfferAlreadyExists; do not race the success navigate.
        if (submittedOfferRef.current || creatingOffer) return;
        if (lookup == null || lookup.__typename === 'CookBookingRequestNotFound') return;
        if (isPoolUnavailableKind(lookup.__typename)) return;
        if (request == null) return;
        const declined = request.cookPoolDetails?.declinedAt != null;
        const ready = cook.stripeStatus === 'COMPLETED' && cook.canCreateOffers;
        const hasOrigin = cook.exactTravelOriginAddress != null;
        if (declined || !ready || !hasOrigin) {
            void navigate({ to: '/{-$locale}/profile/booking-request-pool/$bookingRequestId', params: { bookingRequestId } });
        }
    }, [bookingRequestId, cook, creatingOffer, lookup, navigate, request, user]);

    useEffect(() => {
        if (cook == null) return;
        setSelectedMenuIds((current) => {
            const next = current.filter((menuId) => {
                const menu = cook.menus.find((row) => row.menuId === menuId);
                if (menu == null) return false;
                return cookMenuSelectPanelMenuIsComplete(
                    menu.courses.map((course) => ({
                        title: course.title,
                        mealOptionCount: course.mealOptions.length,
                    })),
                );
            });
            return next.length === current.length ? current : next;
        });
    }, [cook]);

    useEffect(() => {
        if (step !== 'price') return;
        if (selectedMenuIds.length > 0) return;
        setStep('menus');
    }, [selectedMenuIds.length, step]);

    useEffect(() => {
        const next = profileCookBookingRequestOfferCreateSearchForUrl({
            menus: selectedMenuIds,
            price: menuPriceCents,
            message,
            step,
        });
        if (offerCreateSearchEqual(next, search)) return;
        void navigate({
            to: '/{-$locale}/profile/booking-request-pool/$bookingRequestId/create',
            params: { bookingRequestId },
            search: next,
            replace: true,
        });
    }, [bookingRequestId, menuPriceCents, message, navigate, search, selectedMenuIds, step]);

    if (cook == null || lookup == null) {
        return null;
    }

    if (lookup.__typename === 'CookBookingRequestNotFound') {
        throw notFound();
    }

    if (isPoolUnavailableKind(lookup.__typename)) {
        if (submittedOfferRef.current || creatingOffer) {
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

    const stripeReady = cook.stripeStatus === 'COMPLETED' && cook.canCreateOffers;
    const hasTravelOrigin = cook.exactTravelOriginAddress != null;
    const travelExpensesCents = request.estimatedTravelExpensesCents ?? 0;
    const adults = request.participants.filter((participant) => participant.type === 'ADULT').length;
    const discounted = request.participants.filter((participant) => participant.type === 'DISCOUNTED').length;
    const paidParticipants = adults + discounted;
    const remainingOpenAfterThis = cook.openBookingRequests.filter((open) => open.bookingRequestId !== bookingRequestId).length;
    const initialPricePerPersonCents =
        priceSeedFromSearch != null && priceSeedFromSearch > 0 && paidParticipants > 0
            ? Math.round(priceSeedFromSearch / paidParticipants)
            : undefined;

    const inventoryMenus = cook.menus.map((menu) => ({
        menuId: menu.menuId,
        title: menu.title,
        description: menu.description,
        courseMealOptionImages: menu.courseMealOptionImages,
        courses: menu.courses.map((course) => ({
            title: course.title,
            mealOptionCount: course.mealOptions.length,
        })),
    }));

    async function onCreateOffer() {
        const suggestedMenuIds = completeSelectedMenuIds();
        if (suggestedMenuIds.length === 0) {
            setMenuSelectionError(
                {
                    de: 'Bitte wähle mindestens ein Menü aus.',
                    en: 'Please select at least one menu.',
                }[locale],
            );
            setStep('menus');
            return;
        }
        setMenuSelectionError(null);
        if (!priceValid || menuPriceCents <= 0) {
            toast.error(
                {
                    de: 'Bitte gib einen gültigen Menüpreis ein.',
                    en: 'Please enter a valid menu price.',
                }[locale],
            );
            return;
        }
        const trimmedMessage = message.trim();
        if (trimmedMessage.length > 0 && containsPhoneNumber(trimmedMessage)) {
            return;
        }
        trackFunnelStep('step_completed', 'price');
        setCreatingOffer(true);
        try {
            const result = await createOffer({
                input: {
                    bookingRequestId,
                    suggestedMenuIds,
                    menuPriceCents,
                    message: trimmedMessage.length > 0 ? trimmedMessage : null,
                },
            });
            const offerId = result.data?.user.cook.bookingRequestOfferCreate.referenceId;
            if (result.error || !result.data?.user.cook.bookingRequestOfferCreate.success || offerId == null) {
                throw new Error('offer create failed');
            }
            submittedOfferRef.current = true;
            toast.success({ de: 'Angebot gesendet.', en: 'Offer sent.' }[locale]);
            // More open requests → keep swiping the pool; last one → land on the offer just made.
            if (remainingOpenAfterThis > 0) {
                await navigate({ to: poolRoute.to });
            } else {
                await navigate({
                    to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
                    params: { bookingRequestOfferId: offerId },
                });
            }
        } catch {
            toast.error({ de: 'Angebot fehlgeschlagen.', en: 'Could not create the offer.' }[locale]);
        } finally {
            setCreatingOffer(false);
        }
    }

    function completeSelectedMenuIds(): string[] {
        return selectedMenuIds.filter((menuId) => {
            const menu = inventoryMenus.find((row) => row.menuId === menuId);
            return menu != null && cookMenuSelectPanelMenuIsComplete(menu.courses);
        });
    }

    function onContinueToPrice() {
        const suggestedMenuIds = completeSelectedMenuIds();
        if (suggestedMenuIds.length === 0) {
            setMenuSelectionError(
                {
                    de: 'Bitte wähle mindestens ein Menü aus.',
                    en: 'Please select at least one menu.',
                }[locale],
            );
            menusSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        setMenuSelectionError(null);
        trackFunnelStep('step_completed', 'menus');
        trackFunnelStep('step_completed', 'offer_create');
        setStep('price');
        pageTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function onBackToMenus() {
        setStep('menus');
        pageTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function toggleMenu(menuId: string) {
        const menu = inventoryMenus.find((row) => row.menuId === menuId);
        if (menu == null || !cookMenuSelectPanelMenuIsComplete(menu.courses)) return;
        setSelectedMenuIds((current) => {
            const next = current.includes(menuId) ? current.filter((id) => id !== menuId) : [...current, menuId];
            if (next.length > 0) setMenuSelectionError(null);
            return next;
        });
    }

    function returnToOfferCreate(menus: readonly string[]): string {
        return returnToFromLocation({
            pathname: location.pathname,
            searchStr: searchToSearchStr(
                profileCookBookingRequestOfferCreateSearchForUrl({
                    menus,
                    price: menuPriceCents,
                    message,
                    step: 'menus',
                }),
            ),
        });
    }

    async function navigateToMenuEdit(menuId: string, menusForReturn: readonly string[]) {
        await navigate({
            to: '/{-$locale}/profile/menus/$menuId/edit',
            params: { menuId },
            search: { returnTo: returnToOfferCreate(menusForReturn) },
        });
    }

    const busy = creatingOffer || creatingMenu || refreshingEvaluation || applyingGeneratedMenu;
    const poolDetails = request.cookPoolDetails;
    const menuEvaluation = poolDetails?.menuEvaluation ?? null;
    const menuEvaluationLoading = poolDetails?.menuEvaluationLoading === true;
    const generatedMenu = menuEvaluation?.generatedMenu ?? null;
    const hasCompleteMenuSelection = completeSelectedMenuIds().length > 0;
    const stepNumber = step === 'menus' ? 1 : 2;
    const progressPercent = Math.min(100, Math.max(0, (stepNumber / 2) * 100));

    async function onRefreshMenuEvaluation() {
        if (busy || !menuEvaluationEnabled) return;
        setRefreshingEvaluation(true);
        try {
            const result = await refreshMenuEvaluation({ bookingRequestId });
            if (result.error || !result.data?.user.cook.bookingRequestMenuEvaluationRefresh.success) {
                throw new Error('refresh failed');
            }
            setRecommendationApplied(false);
            applyingGeneratedMenuRef.current = false;
        } catch {
            toast.error(
                {
                    de: 'Empfehlungen konnten nicht aktualisiert werden.',
                    en: 'Could not refresh recommendations.',
                }[locale],
            );
        } finally {
            setRefreshingEvaluation(false);
        }
    }

    async function onApplyGeneratedMenu() {
        // Ref guard: React state is async, so a double-click can pass `busy` twice.
        if (applyingGeneratedMenuRef.current || busy || !menuEvaluationEnabled || generatedMenu == null) return;
        applyingGeneratedMenuRef.current = true;
        setApplyingGeneratedMenu(true);
        try {
            const result = await applyGeneratedMenu({ bookingRequestId });
            const menuId = result.data?.user.cook.bookingRequestGeneratedMenuApply.referenceId;
            if (result.error || !result.data?.user.cook.bookingRequestGeneratedMenuApply.success || menuId == null) {
                throw new Error('apply failed');
            }
            setSelectedMenuIds((current) => (current.includes(menuId) ? current : [...current, menuId]));
            setMenuSelectionError(null);
            setRecommendationApplied(true);
            toast.success(
                {
                    de: 'Empfohlenes Menü angelegt und ausgewählt.',
                    en: 'Recommended menu created and selected.',
                }[locale],
            );
        } catch {
            toast.error(
                {
                    de: 'Empfehlung konnte nicht übernommen werden.',
                    en: 'Could not apply the recommendation.',
                }[locale],
            );
            applyingGeneratedMenuRef.current = false;
        } finally {
            setApplyingGeneratedMenu(false);
        }
    }

    async function onCreateMenu() {
        if (busy) return;
        setCreatingMenu(true);
        try {
            const result = await createMenu({});
            const menuId = result.data?.user.cook.menuCreate.referenceId;
            if (!menuId || result.error) throw new Error('create failed');
            const menusForReturn = selectedMenuIds.includes(menuId) ? selectedMenuIds : [...selectedMenuIds, menuId];
            toast.success({ de: 'Menü angelegt.', en: 'Menu created.' }[locale]);
            await navigateToMenuEdit(menuId, menusForReturn);
        } catch {
            toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create.' }[locale]);
            setCreatingMenu(false);
        }
    }

    async function onEditMenu(menuId: string) {
        if (busy) return;
        const menu = inventoryMenus.find((row) => row.menuId === menuId);
        const preselectOnReturn = selectedMenuIds.includes(menuId) || (menu != null && !cookMenuSelectPanelMenuIsComplete(menu.courses));
        const menusForReturn = preselectOnReturn && !selectedMenuIds.includes(menuId) ? [...selectedMenuIds, menuId] : selectedMenuIds;
        await navigateToMenuEdit(menuId, menusForReturn);
    }

    return (
        <ProfilePinnedFooterLayout
            className="@container"
            contentClassName="grid content-start gap-8"
            footer={
                step === 'menus' ? (
                    <>
                        <Button type="button" variant="outline" asChild disabled={busy}>
                            <Link to="/{-$locale}/profile/booking-request-pool/$bookingRequestId" params={{ bookingRequestId }}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Link>
                        </Button>
                        <Button type="button" disabled={busy || !hasCompleteMenuSelection} onClick={onContinueToPrice}>
                            {{ de: 'Weiter', en: 'Continue' }[locale]}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button type="button" variant="outline" disabled={busy} onClick={onBackToMenus}>
                            {{ de: 'Zurück', en: 'Back' }[locale]}
                        </Button>
                        <Button
                            type="button"
                            disabled={busy || !stripeReady || !hasTravelOrigin || !priceValid || messageContainsPhoneNumber}
                            onClick={() => void onCreateOffer()}
                        >
                            {
                                {
                                    de: creatingOffer ? 'Wird gesendet…' : 'Angebot machen',
                                    en: creatingOffer ? 'Sending…' : 'Make offer',
                                }[locale]
                            }
                        </Button>
                    </>
                )
            }
        >
            <div ref={pageTopRef} className="grid gap-3">
                <div aria-hidden="true" className="overflow-hidden rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary transition-[width]" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="grid gap-1">
                    <h1 className="font-serif text-2xl text-foreground">{profileCookBookingRequestOfferCreatePageTitle[locale]}</h1>
                    <p className="text-sm text-muted-foreground">
                        {
                            (step === 'menus'
                                ? {
                                      de: 'Wähle oder erstelle mindestens ein Menü für dein Angebot.',
                                      en: 'Select or create at least one menu for your offer.',
                                  }
                                : {
                                      de: 'Setze den Preis und optional eine Nachricht an den Gast.',
                                      en: 'Set the price and optionally a message to the guest.',
                                  })[locale]
                        }
                    </p>
                </div>
            </div>

            <div
                ref={menusSectionRef}
                className={cn('grid gap-3', step !== 'menus' && 'hidden')}
                aria-hidden={step !== 'menus'}
                inert={step !== 'menus' ? true : undefined}
            >
                {menuSelectionError != null ? <StatusAlert tone="error">{menuSelectionError}</StatusAlert> : null}
                <CookMenuSelectPanel
                    menus={inventoryMenus}
                    selectedMenuIds={selectedMenuIds}
                    onToggle={toggleMenu}
                    onCreateMenu={() => void onCreateMenu()}
                    onEditMenu={(menuId) => void onEditMenu(menuId)}
                    createMenuDisabled={busy}
                    editMenuDisabled={busy}
                    menuEvaluations={menuEvaluationEnabled ? (menuEvaluation?.menus ?? null) : null}
                    menuEvaluationLoading={menuEvaluationEnabled && menuEvaluationLoading}
                    evaluationSummary={menuEvaluationEnabled && !recommendationApplied ? (menuEvaluation?.evaluationSummary ?? null) : null}
                    generatedMenu={
                        menuEvaluationEnabled && generatedMenu != null && !recommendationApplied
                            ? {
                                  title: generatedMenu.title,
                                  description: generatedMenu.description,
                                  courseCount: generatedMenu.courses.length,
                              }
                            : null
                    }
                    onApplyGeneratedMenu={
                        menuEvaluationEnabled && generatedMenu != null && !recommendationApplied
                            ? () => void onApplyGeneratedMenu()
                            : undefined
                    }
                    applyGeneratedMenuDisabled={busy || recommendationApplied}
                    onRefreshEvaluation={menuEvaluationEnabled ? () => void onRefreshMenuEvaluation() : undefined}
                    refreshEvaluationDisabled={busy}
                />
            </div>

            <div
                className={cn('grid max-w-lg gap-8', step !== 'price' && 'hidden')}
                aria-hidden={step !== 'price'}
                inert={step !== 'price' ? true : undefined}
            >
                <BookingRequestOfferPriceConfigurationPanel
                    locale={locale}
                    viewer="cook"
                    participantsAdult={adults}
                    participantsDiscounted={discounted}
                    travelExpensesCents={travelExpensesCents}
                    guidance={{
                        suggestedOfferAmountCents: request.suggestedOfferAmountCents,
                        minOfferAmountCents: request.minOfferAmountCents ?? null,
                        maxOfferAmountCents: request.maxOfferAmountCents ?? null,
                        minOfferAmountHardCents: request.minOfferAmountHardCents ?? null,
                    }}
                    resetKey={request.bookingRequestId}
                    initialPricePerPersonCents={initialPricePerPersonCents}
                    disabled={busy}
                    onMenuPriceCentsChange={setMenuPriceCents}
                    onValidChange={setPriceValid}
                />

                <div className="grid gap-2">
                    <label htmlFor={messageFieldId} className="text-base font-medium text-foreground">
                        {{ de: 'Nachricht an den Gast (optional)', en: 'Message to the guest (optional)' }[locale]}
                    </label>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Erscheint als erste Nachricht im Angebots-Chat.',
                                en: 'Appears as your first message in the offer chat.',
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
                        id={messageFieldId}
                        rows={4}
                        value={message}
                        disabled={busy}
                        maxLength={OFFER_CREATE_MESSAGE_MAX_LENGTH}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={
                            {
                                de: 'z. B. Freue mich auf euer Event…',
                                en: 'e.g. Looking forward to your event…',
                            }[locale]
                        }
                        aria-invalid={messageContainsPhoneNumber || undefined}
                    />
                </div>

                {!stripeReady || !hasTravelOrigin ? (
                    <StatusAlert tone="warning" title={{ de: 'Voraussetzungen fehlen', en: 'Requirements missing' }[locale]}>
                        {
                            {
                                de: 'Wallet und Reise-Startort müssen eingerichtet sein.',
                                en: 'Wallet and travel origin must be set up.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : null}
            </div>
        </ProfilePinnedFooterLayout>
    );
}
