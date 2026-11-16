import { useForm, useSelector } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { de as dateFnsDe, enUS as dateFnsEn } from 'date-fns/locale';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MinusIcon,
    PencilIcon,
    PlusIcon,
    ShoppingBagIcon,
    SparklesIcon,
    StarIcon,
    UtensilsIcon,
} from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { t as translate } from '../../i18n/t';
import type { BookingRequestFormPriceClassType, ExpansionMarket, Locale } from '../../shared';
import {
    bookingRequestMarketClosedFromMessage,
    bookingRequestPriceClassInfo,
    bookingRequestPriceClassTypes,
    expansionMarketComingToPhrase,
    expansionMarketFromCountry,
    featureToggleIsActive,
    formatCountryName,
    formatCurrency,
    formatDate,
    formatMonthYear,
    formatTime,
} from '../../shared';
import { AppImage } from '../components/AppImage';
import { AuthIdentityGate } from '../components/auth/AuthIdentityGate';
import { AuthIdentityGateLogOnFooter } from '../components/auth/AuthIdentityGateLogOnFooter';
import { sessionAuthPhase } from '../components/auth/sessionAuthPhase';
import { Badge } from '../components/base/badge';
import { Button } from '../components/base/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/base/card';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../components/base/combobox';
import { DatePicker } from '../components/base/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/base/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/base/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../components/base/sheet';
import { Skeleton } from '../components/base/skeleton';
import { Textarea } from '../components/base/textarea';
import { BookingRequestMarketClosedNotice } from '../components/BookingRequestMarketClosedNotice';
import { BookingRequestSettingPicker } from '../components/BookingRequestSettingPicker';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import type {
    GqlCBookingRequestPlanPageQuery,
    GqlCLocationSuggestion,
    GqlCUserBookingRequestExactEventAddressInput,
} from '../graphql/generated';
import {
    BookingRequestPlanCreateDocument,
    BookingRequestPlanExpectedMenuPriceRangeDocument,
    BookingRequestPlanLocationSuggestionsDocument,
} from '../graphql/generated';
import { useIsMobile } from '../hooks/use-mobile';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useT } from '../hooks/useT';
import { SectionPageTestimonials } from '../sections/SectionPageTestimonials';
import type { QuestionsAndAnswersEntry } from '../sections/SectionQuestionsAndAnswers';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';
import { SITE_WHATSAPP_URL } from '../seo/seoConstants';
import { cn } from '../utils/cn';
import type {
    BookingRequestPlanCuisineKey,
    BookingRequestPlanSearch,
    BookingRequestPlanStep,
    BookingRequestPlanValues,
} from './bookingRequestPlanSearch';
import {
    bookingRequestFormDateTimeBoundsFromSearch,
    bookingRequestFormHourOptions,
    bookingRequestFormMinuteOptions,
    bookingRequestPlanChefArrivalHint,
    bookingRequestPlanCreateInputFromValues,
    bookingRequestPlanCuisineKeys,
    bookingRequestPlanCuisineLabel,
    bookingRequestPlanCuisineSubtitle,
    bookingRequestPlanSearchEqual,
    bookingRequestPlanSearchFromValues,
    bookingRequestPlanSelectableDays,
    bookingRequestPlanUsesDateChips,
    bookingRequestPlanValuesFromSearch,
} from './bookingRequestPlanSearch';

export { parseBookingRequestPlanSearch } from './bookingRequestPlanSearch';
export type { BookingRequestPlanSearch } from './bookingRequestPlanSearch';

const HERO_FALLBACK_SRC = '/home/empty-section/dinner-table-in-nature.webp';
const selectionControlClassName =
    'cursor-pointer outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

function selectionSurfaceClassName(selected: boolean): string {
    return selected
        ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80'
        : 'border-border bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted/80';
}

const FORETASTE_ITEMS = [
    { src: '/booking-request/plan/foretaste-1.png', captionKey: 'plan.foretaste.item1' },
    { src: '/booking-request/plan/foretaste-2.jpg', captionKey: 'plan.foretaste.item2' },
    { src: '/booking-request/plan/foretaste-3.png', captionKey: 'plan.foretaste.item3' },
    { src: '/booking-request/plan/foretaste-4.jpg', captionKey: 'plan.foretaste.item4' },
    { src: '/booking-request/plan/foretaste-5.jpg', captionKey: 'plan.foretaste.item5' },
] as const;

const CARE_ITEMS = [
    { icon: ShoppingBagIcon, titleKey: 'plan.care.prepared.title', bodyKey: 'plan.care.prepared.body' },
    { icon: UtensilsIcon, titleKey: 'plan.care.cooked.title', bodyKey: 'plan.care.cooked.body' },
    { icon: SparklesIcon, titleKey: 'plan.care.clean.title', bodyKey: 'plan.care.clean.body' },
] as const;

function marketComingTo(market: ExpansionMarket, locale: Locale): string {
    return expansionMarketComingToPhrase(market, locale);
}

type PlanSession = GqlCBookingRequestPlanPageQuery['currentSession'];
type PlanVenue = NonNullable<GqlCBookingRequestPlanPageQuery['publicPartnerVenue']['findOne']>;

function addressFromSuggestion(suggestion: GqlCLocationSuggestion): GqlCUserBookingRequestExactEventAddressInput | null {
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

function venueDefaultAddress(venue: PlanVenue | null | undefined): GqlCUserBookingRequestExactEventAddressInput | null {
    if (!venue?.locationAddress) return null;
    const address = venue.locationAddress;
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

function planFaqs(locale: Locale): ReadonlyArray<QuestionsAndAnswersEntry> {
    const ns = 'publicBooking' as const;
    return [
        { question: translate(locale, ns, 'plan.faq.included.question'), answer: translate(locale, ns, 'plan.faq.included.answer') },
        { question: translate(locale, ns, 'plan.faq.after.question'), answer: translate(locale, ns, 'plan.faq.after.answer') },
        { question: translate(locale, ns, 'plan.faq.wishes.question'), answer: translate(locale, ns, 'plan.faq.wishes.answer') },
        { question: translate(locale, ns, 'plan.faq.cost.question'), answer: translate(locale, ns, 'plan.faq.cost.answer') },
    ];
}

function sampleMenuCopy(cuisine: BookingRequestPlanCuisineKey, locale: Locale) {
    const ns = 'publicBooking' as const;
    const cuisineLabel = bookingRequestPlanCuisineLabel(cuisine, locale);
    const courseKeys = ['starter', 'main', 'dessert'] as const;
    return {
        title: translate(locale, ns, `plan.sampleMenu.${cuisine}.title`),
        description: translate(locale, ns, 'plan.sampleMenu.description', { cuisine: cuisineLabel }),
        courses: courseKeys.map((course) => ({
            course: translate(locale, ns, `plan.sampleMenu.course.${course}`),
            title: translate(locale, ns, `plan.sampleMenu.${cuisine}.${course}.title`),
            description: translate(locale, ns, `plan.sampleMenu.${cuisine}.${course}.description`),
        })),
    };
}

function bookingRequestPlanDateChipRangeLabel(days: ReadonlyArray<Date>, fallback: Date, locale: Locale): string {
    const first = days[0] ?? fallback;
    const last = days[days.length - 1] ?? first;
    if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
        return formatMonthYear(first, { locale, month: 'long' });
    }
    const languageTag = locale === 'de' ? 'de-DE' : 'en-US';
    const monthName = (day: Date) => new Intl.DateTimeFormat(languageTag, { month: 'long' }).format(day);
    if (first.getFullYear() === last.getFullYear()) {
        return `${monthName(first)} - ${monthName(last)} ${first.getFullYear()}`;
    }
    return `${monthName(first)} ${first.getFullYear()} - ${monthName(last)} ${last.getFullYear()}`;
}

function ParticipantCountField({
    label,
    subtitle,
    value,
    min,
    disabled,
    onChange,
}: {
    label: string;
    subtitle?: string;
    value: number;
    min: number;
    disabled: boolean;
    onChange: (next: number) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="grid gap-0.5">
                <span className="text-sm font-medium">{label}</span>
                {subtitle ? <span className="text-sm text-muted-foreground">{subtitle}</span> : null}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                    disabled={disabled || value <= min}
                    aria-label={`- ${label}`}
                    onClick={() => onChange(Math.max(min, value - 1))}
                >
                    <MinusIcon className="size-4" />
                </Button>
                <span className="w-6 text-center text-sm font-medium tabular-nums">{value}</span>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                    disabled={disabled}
                    aria-label={`+ ${label}`}
                    onClick={() => onChange(value + 1)}
                >
                    <PlusIcon className="size-4" />
                </Button>
            </div>
        </div>
    );
}

function BookingRequestPlanForetasteCarousel() {
    const { t } = useT('publicBooking');
    const scrollerRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
    const [canScrollStart, setCanScrollStart] = useState(false);
    const [canScrollEnd, setCanScrollEnd] = useState(false);

    const updateScrollState = useEffectEvent(() => {
        const scroller = scrollerRef.current;
        if (scroller == null) return;
        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
        setCanScrollStart(scroller.scrollLeft > 4);
        setCanScrollEnd(scroller.scrollLeft < maxScrollLeft - 4);
    });

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller == null) return;
        updateScrollState();
        scroller.addEventListener('scroll', updateScrollState, { passive: true });
        const resizeObserver = new ResizeObserver(() => updateScrollState());
        resizeObserver.observe(scroller);
        return () => {
            scroller.removeEventListener('scroll', updateScrollState);
            resizeObserver.disconnect();
        };
    }, []);

    function scrollByCard(direction: -1 | 1) {
        const scroller = scrollerRef.current;
        if (scroller == null) return;
        const card = scroller.querySelector('figure');
        const cardWidth = card instanceof HTMLElement ? card.offsetWidth : scroller.clientWidth * 0.7;
        const gap = 16;
        scroller.scrollBy({
            left: direction * (cardWidth + gap),
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-start justify-between gap-4">
                <div className="grid min-w-0 gap-2">
                    <h2 className="font-serif text-3xl font-light @md:text-4xl">{t('plan.foretaste.title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('plan.foretaste.subtitle')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                        disabled={!canScrollStart}
                        aria-label={t('plan.foretaste.previous')}
                        onClick={() => scrollByCard(-1)}
                    >
                        <ChevronLeftIcon className="size-4" aria-hidden />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                        disabled={!canScrollEnd}
                        aria-label={t('plan.foretaste.next')}
                        onClick={() => scrollByCard(1)}
                    >
                        <ChevronRightIcon className="size-4" aria-hidden />
                    </Button>
                </div>
            </div>
            <div ref={scrollerRef} className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 no-scrollbar">
                {FORETASTE_ITEMS.map((item) => (
                    <figure key={item.src} className="relative aspect-9/16 w-52 shrink-0 snap-start overflow-hidden rounded-2xl">
                        <AppImage
                            src={item.src}
                            alt={t(item.captionKey)}
                            draggable={false}
                            className="absolute inset-0 size-full object-cover select-none"
                        />
                        <div
                            className="absolute inset-x-0 top-0 bg-linear-to-b from-black/70 via-black/35 to-transparent px-4 pt-4 pb-12"
                            aria-hidden
                        />
                        <figcaption className="absolute inset-x-0 top-0 px-4 pt-4 text-sm font-medium text-white">
                            {t(item.captionKey)}
                        </figcaption>
                    </figure>
                ))}
            </div>
        </div>
    );
}

export function BookingRequestPlanPage({
    loaderData,
    search,
}: {
    loaderData: GqlCBookingRequestPlanPageQuery;
    search: BookingRequestPlanSearch;
}) {
    const locale = useLocale();
    const { t: tBooking } = useT('publicBooking');
    const navigate = useNavigate({ from: '/{-$locale}/booking-request/plan' });
    const [session, setSession] = useState<PlanSession>(loaderData.currentSession);
    const venue = loaderData.publicPartnerVenue.findOne ?? null;
    // Keep AuthIdentityGate mounted after OTP / register so its onReady effect can create the
    // booking request in the same click. Unmounting on signedIn raced that effect and forced a
    // second "Send booking request" press.
    const [startedSignedIn] = useState(() => sessionAuthPhase(loaderData.currentSession) === 'signedIn');
    const settingEnabled = featureToggleIsActive(session.activeFeatureToggleKeys, 'BOOKING_REQUEST_SETTING');
    const expectedMenuPriceRangeEnabled = featureToggleIsActive(
        session.activeFeatureToggleKeys,
        'BOOKING_REQUEST_EXPECTED_MENU_PRICE_RANGE',
    );
    const [step, setStep] = useState<BookingRequestPlanStep>(() => (search.step === 'contact' ? 'contact' : 'details'));
    const [detailsEditorOpen, setDetailsEditorOpen] = useState(false);
    const isMobile = useIsMobile();
    const [menuDialogOpen, setMenuDialogOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const createStarted = useRef(false);

    const venueAddress = useMemo(() => venueDefaultAddress(venue), [venue]);
    const [seeded] = useState(() => bookingRequestPlanValuesFromSearch(search, venueAddress));

    const form = useForm({
        defaultValues: seeded,
    });
    const values = useSelector(form.store, (state) => state.values);
    const [, createBooking] = useMutation(BookingRequestPlanCreateDocument);

    const bounds = bookingRequestFormDateTimeBoundsFromSearch({
        minDateTime: search.minDateTime,
        maxDateTime: search.maxDateTime,
    });
    const selectableDays = useMemo(() => bookingRequestPlanSelectableDays(bounds), [bounds]);
    const useDateChips = bookingRequestPlanUsesDateChips(bounds, selectableDays.length);
    const datePickerStartMonth = bounds.minDateTime ?? new Date();
    const datePickerEndMonth = bounds.maxDateTime;
    const priceInfo = bookingRequestPriceClassInfo(values.priceClassType, locale);
    const softPrice = formatCurrency(priceInfo.minimumAmountPerPersonCents, { locale });
    const guestCount = values.adultCount + values.discountedCount;
    const exactEventCountryName = values.exactEventAddress ? formatCountryName(values.exactEventAddress.country, { locale }) : '';

    const debouncedAdultCount = useDebouncedValue(values.adultCount, 250);
    const debouncedDiscountedCount = useDebouncedValue(values.discountedCount, 250);
    const [{ data: expectedPriceRangeData }] = useQuery({
        query: BookingRequestPlanExpectedMenuPriceRangeDocument,
        variables: {
            participantsAdult: Math.max(1, debouncedAdultCount),
            participantsDiscounted: Math.max(0, debouncedDiscountedCount),
        },
        pause: !expectedMenuPriceRangeEnabled,
    });
    const expectedPriceRange = expectedPriceRangeData?.bookingRequestExpectedMenuPriceRange ?? null;
    const expectedPriceRangeLabel =
        expectedPriceRange == null
            ? null
            : `${formatCurrency(expectedPriceRange.minAmountCents, { locale, maximumFractionDigits: 0 })}–${formatCurrency(expectedPriceRange.maxAmountCents, { locale, maximumFractionDigits: 0 })}`;
    // Keep the last resolved band while guest-count debounce / refetch runs so the slot never collapses.
    const lastExpectedPriceRangeLabelRef = useRef<string | null>(null);
    if (expectedPriceRangeLabel) {
        lastExpectedPriceRangeLabelRef.current = expectedPriceRangeLabel;
    }
    const displayExpectedPriceRangeLabel = expectedPriceRangeLabel ?? lastExpectedPriceRangeLabelRef.current;

    const greetingName = search.firstName?.trim() || session.user?.firstName?.trim() || '';
    const heroSrc = venue?.firstSectionImageUrl || venue?.heroImageUrl || HERO_FALLBACK_SRC;
    const venueCity = values.exactEventAddress?.city || venueAddress?.city || '';

    const debouncedLocationSearch = useDebouncedValue(values.locationSearchText, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: BookingRequestPlanLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || values.exactEventAddress?.displayText === values.locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    const syncSearch = useEffectEvent((nextValues: BookingRequestPlanValues, nextStep: BookingRequestPlanStep) => {
        const nextSearch = bookingRequestPlanSearchFromValues({
            values: nextValues,
            step: nextStep,
            venueId: search.venueId,
            firstName: search.firstName,
            minDateTime: search.minDateTime,
            maxDateTime: search.maxDateTime,
        });
        if (bookingRequestPlanSearchEqual(nextSearch, search)) return;
        void navigate({ search: nextSearch, replace: true, resetScroll: false });
    });

    const draftKey = JSON.stringify({
        adults: values.adultCount,
        children: values.discountedCount,
        dateTime: values.dateTime.toISOString(),
        cuisine: values.cuisine,
        priceClassType: values.priceClassType,
        address: values.exactEventAddress?.displayText ?? null,
        location: values.locationSearchText,
        message: values.originalMessage,
        redeemCode: values.redeemCode,
        occasion: values.occasion,
        settingChoice: values.settingChoice,
        step,
    });
    const debouncedDraftKey = useDebouncedValue(draftKey, 250);

    useEffect(() => {
        syncSearch(values, step);
    }, [debouncedDraftKey, values, step]);

    useEffect(() => {
        if (venue?.promo?.redeemCode && !values.redeemCode) {
            form.setFieldValue('redeemCode', venue.promo.redeemCode);
        }
    }, [venue?.promo?.redeemCode, form, values.redeemCode]);

    function selectDay(day: Date) {
        const next = new Date(values.dateTime);
        next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
        const hours = bookingRequestFormHourOptions(next, bounds);
        const hour = hours.includes(next.getHours()) ? next.getHours() : (hours[0] ?? 19);
        const minutes = bookingRequestFormMinuteOptions(next, hour, bounds);
        const minute = minutes.includes(next.getMinutes()) ? next.getMinutes() : (minutes[0] ?? 0);
        next.setHours(hour, minute, 0, 0);
        form.setFieldValue('dateTime', next);
    }

    function setMenuTime(hour: number, minute: number) {
        const next = new Date(values.dateTime);
        next.setHours(hour, minute, 0, 0);
        form.setFieldValue('dateTime', next);
    }

    const closedMarket = values.exactEventAddress ? expansionMarketFromCountry(values.exactEventAddress.country) : null;

    function canContinueToContact(): boolean {
        return values.exactEventAddress != null && values.adultCount >= 1 && closedMarket == null;
    }

    function goToContact() {
        if (closedMarket) {
            toast.error(tBooking('marketClosed.toast', { comingTo: marketComingTo(closedMarket, locale) }));
            return;
        }
        if (!canContinueToContact()) {
            toast.error(tBooking('plan.contact.completeDetails'));
            return;
        }
        setStep('contact');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function submitBooking() {
        if (createStarted.current) return;
        if (closedMarket) {
            toast.error(tBooking('marketClosed.toast', { comingTo: marketComingTo(closedMarket, locale) }));
            return;
        }
        if (values.originalMessage.trim().length === 0) {
            toast.error(tBooking('plan.contact.messageRequired'));
            return;
        }
        const input = bookingRequestPlanCreateInputFromValues(values, locale, {
            includePriceClassType: !expectedMenuPriceRangeEnabled,
        });
        if (!input) {
            toast.error(tBooking('requiredFields'));
            return;
        }
        createStarted.current = true;
        setBusy(true);
        try {
            const result = await createBooking({ input });
            const created = result.data?.user.bookingRequestCreate;
            if (result.error || !created?.success || !created.referenceId) {
                createStarted.current = false;
                const closedFromError = bookingRequestMarketClosedFromMessage(result.error?.message);
                toast.error(
                    closedFromError
                        ? tBooking('marketClosed.toast', { comingTo: marketComingTo(closedFromError, locale) })
                        : tBooking('createFailed'),
                );
                return;
            }
            toast.success(tBooking('created'));
            await navigate({
                to: '/{-$locale}/booking-request/$bookingRequestId/submitted',
                params: { bookingRequestId: created.referenceId },
            });
        } finally {
            setBusy(false);
        }
    }

    const selectedDayKey = `${values.dateTime.getFullYear()}-${values.dateTime.getMonth()}-${values.dateTime.getDate()}`;
    const hourOptions = bookingRequestFormHourOptions(values.dateTime, bounds);
    const minuteOptions = bookingRequestFormMinuteOptions(values.dateTime, values.dateTime.getHours(), bounds);
    const sampleMenu = sampleMenuCopy(values.cuisine, locale);
    const dateChipRangeLabel = bookingRequestPlanDateChipRangeLabel(
        useDateChips ? selectableDays : [values.dateTime],
        values.dateTime,
        locale,
    );

    const summaryCard = (
        <aside className="rounded-xl border border-border bg-card p-5 shadow-xs" aria-label={tBooking('plan.summary.aria')}>
            <p className="font-serif text-xl tracking-tight">{tBooking('plan.summary.title')}</p>
            <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{tBooking('date')}</dt>
                    <dd className="text-right">{formatDate(values.dateTime, { locale, weekday: true, dateStyle: 'medium' })}</dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{tBooking('plan.summary.guests')}</dt>
                    <dd className="text-right">
                        {[
                            tBooking('plan.summary.adults', { count: values.adultCount }),
                            values.discountedCount > 0 ? tBooking('plan.summary.children', { count: values.discountedCount }) : null,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{tBooking('plan.summary.cuisine')}</dt>
                    <dd className="text-right">{bookingRequestPlanCuisineLabel(values.cuisine, locale)}</dd>
                </div>
                {!expectedMenuPriceRangeEnabled ? (
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{tBooking('priceClass')}</dt>
                        <dd className="text-right">{priceInfo.title}</dd>
                    </div>
                ) : null}
                <div className="grid gap-1">
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{tBooking('plan.summary.menuStart')}</dt>
                        <dd className="text-right">
                            {tBooking('plan.summary.menuStartValue', { time: formatTime(values.dateTime, { locale }) })}
                        </dd>
                    </div>
                    <p className="text-xs text-muted-foreground">{bookingRequestPlanChefArrivalHint(locale)}</p>
                </div>
            </dl>

            <div className="mt-6 grid gap-6">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto w-fit -translate-x-3 justify-start"
                    onClick={() => setDetailsEditorOpen(true)}
                >
                    {tBooking('plan.summary.editDetails')}
                    <PencilIcon className="size-3.5" />
                </Button>

                {expectedMenuPriceRangeEnabled ? (
                    <div className="grid gap-1" aria-busy={displayExpectedPriceRangeLabel == null}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">{tBooking('plan.summary.estimatedTotal')}</p>
                            <div className="flex h-7 min-w-28 shrink-0 items-center justify-end">
                                {displayExpectedPriceRangeLabel ? (
                                    <p className="text-right text-lg/7 font-semibold text-foreground tabular-nums">
                                        {displayExpectedPriceRangeLabel}
                                    </p>
                                ) : (
                                    <Skeleton className="h-5 w-28 motion-reduce:animate-none" aria-hidden />
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {tBooking('plan.summary.estimatedTotalHint', { count: guestCount })}
                        </p>
                    </div>
                ) : null}

                <div className="grid gap-2">
                    <Button type="button" size="lg" className="w-full" onClick={goToContact} disabled={!canContinueToContact()}>
                        {tBooking('plan.summary.continue')}
                        <ArrowRightIcon className="size-4" />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">{tBooking('plan.summary.nonBinding')}</p>
                </div>

                <Button type="button" variant="secondary" size="sm" asChild>
                    <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                        {tBooking('plan.summary.talkToUs')}
                    </a>
                </Button>
            </div>
        </aside>
    );

    function renderLocationPicker() {
        return (
            <div className="grid gap-2">
                <p className="text-sm font-medium">{tBooking('address')}</p>
                <Combobox
                    filter={null}
                    items={suggestions.map((suggestion) => suggestion.displayText)}
                    value={null}
                    inputValue={values.locationSearchText}
                    onValueChange={(next) => {
                        if (next == null) return;
                        const match = suggestions.find((suggestion) => suggestion.displayText === next);
                        if (!match) return;
                        const address = addressFromSuggestion(match);
                        if (!address) {
                            toast.error(tBooking('pickFullAddress'));
                            return;
                        }
                        form.setFieldValue('exactEventAddress', address);
                        form.setFieldValue('locationSearchText', match.displayText);
                    }}
                    onInputValueChange={(next) => {
                        form.setFieldValue('locationSearchText', next);
                        if (values.exactEventAddress && next !== values.exactEventAddress.displayText) {
                            form.setFieldValue('exactEventAddress', null);
                        }
                    }}
                    itemToStringLabel={(item: string) => item}
                >
                    <ComboboxInput
                        className="w-full"
                        placeholder={tBooking('addressPlaceholder')}
                        showClear={false}
                        required={!values.exactEventAddress}
                        disabled={busy}
                    />
                    <ComboboxContent>
                        <ComboboxEmpty>{suggestionsFetching ? tBooking('searching') : tBooking('noMatches')}</ComboboxEmpty>
                        <ComboboxList>
                            {(item: string) => (
                                <ComboboxItem key={item} value={item}>
                                    {item}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
                {closedMarket ? <BookingRequestMarketClosedNotice market={closedMarket} /> : null}
            </div>
        );
    }

    function renderSettingPicker() {
        if (!settingEnabled || values.exactEventAddress == null) return null;
        return (
            <BookingRequestSettingPicker
                locale={locale}
                value={values.settingChoice}
                disabled={busy}
                onChange={(next) => form.setFieldValue('settingChoice', next)}
            />
        );
    }

    const detailsEditorFields = (
        <div className="grid gap-6">
            <ParticipantCountField
                label={tBooking('plan.editor.adults')}
                subtitle={expectedMenuPriceRangeEnabled ? undefined : tBooking('fromAmountPerPerson', { amount: softPrice })}
                value={values.adultCount}
                min={1}
                disabled={busy}
                onChange={(next) => form.setFieldValue('adultCount', next)}
            />
            <ParticipantCountField
                label={tBooking('plan.editor.children')}
                subtitle={tBooking('plan.editor.childrenHint')}
                value={values.discountedCount}
                min={0}
                disabled={busy}
                onChange={(next) => form.setFieldValue('discountedCount', next)}
            />
            <div className="grid gap-2">
                <span className="text-sm font-medium">{tBooking('plan.summary.menuStart')}</span>
                <div className="grid grid-cols-2 gap-2">
                    <Select
                        value={String(values.dateTime.getHours())}
                        onValueChange={(value) => setMenuTime(Number(value), values.dateTime.getMinutes())}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {hourOptions.map((hour) => (
                                <SelectItem key={hour} value={String(hour)}>
                                    {String(hour).padStart(2, '0')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={String(values.dateTime.getMinutes())}
                        onValueChange={(value) => setMenuTime(values.dateTime.getHours(), Number(value))}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {minuteOptions.map((minute) => (
                                <SelectItem key={minute} value={String(minute)}>
                                    {String(minute).padStart(2, '0')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <span className="text-sm font-medium">{tBooking('plan.summary.cuisine')}</span>
                <Select
                    value={values.cuisine}
                    onValueChange={(value) => form.setFieldValue('cuisine', value as BookingRequestPlanCuisineKey)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {bookingRequestPlanCuisineKeys.map((key) => (
                            <SelectItem key={key} value={key}>
                                {bookingRequestPlanCuisineLabel(key, locale)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {!expectedMenuPriceRangeEnabled ? (
                <div className="grid gap-2">
                    <span className="text-sm font-medium">{tBooking('priceClass')}</span>
                    <Select
                        value={values.priceClassType}
                        onValueChange={(value) => form.setFieldValue('priceClassType', value as BookingRequestFormPriceClassType)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {bookingRequestPriceClassTypes.map((priceClass) => {
                                const info = bookingRequestPriceClassInfo(priceClass, locale);
                                const minimum = formatCurrency(info.minimumAmountPerPersonCents, { locale });
                                return (
                                    <SelectItem key={priceClass} value={priceClass}>
                                        {info.title} · {tBooking('fromAmount', { amount: minimum })}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            ) : null}
            {!venueAddress && detailsEditorOpen ? renderLocationPicker() : null}
            {venueAddress && values.exactEventAddress ? (
                <div className="grid gap-1.5 border-t border-border pt-6 text-sm">
                    <span className="font-medium">{tBooking('address')}</span>
                    <p className="text-xs text-muted-foreground">{tBooking('plan.editor.venueAddressHint')}</p>
                    <div className="text-muted-foreground">
                        <p>{values.exactEventAddress.addressLine1}</p>
                        {values.exactEventAddress.addressLine2.trim().length > 0 ? <p>{values.exactEventAddress.addressLine2}</p> : null}
                        <p>
                            {[values.exactEventAddress.postCode, values.exactEventAddress.city]
                                .map((part) => part.trim())
                                .filter(Boolean)
                                .join(' ')}
                        </p>
                        {exactEventCountryName ? <p>{exactEventCountryName}</p> : null}
                    </div>
                </div>
            ) : null}
            {renderSettingPicker()}
        </div>
    );

    const detailsEditor = isMobile ? (
        <Sheet open={detailsEditorOpen} onOpenChange={setDetailsEditorOpen}>
            <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                    <SheetTitle>{tBooking('plan.editor.title')}</SheetTitle>
                    <SheetDescription>
                        {tBooking(expectedMenuPriceRangeEnabled ? 'plan.editor.descriptionWithoutPriceClass' : 'plan.editor.description')}
                    </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-2">{detailsEditorFields}</div>
                <SheetFooter>
                    <Button type="button" className="w-full" onClick={() => setDetailsEditorOpen(false)}>
                        {tBooking('plan.editor.apply')}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    ) : (
        <Dialog open={detailsEditorOpen} onOpenChange={setDetailsEditorOpen}>
            <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{tBooking('plan.editor.title')}</DialogTitle>
                    <DialogDescription>
                        {tBooking(expectedMenuPriceRangeEnabled ? 'plan.editor.descriptionWithoutPriceClass' : 'plan.editor.description')}
                    </DialogDescription>
                </DialogHeader>
                {detailsEditorFields}
                <DialogFooter>
                    <Button type="button" onClick={() => setDetailsEditorOpen(false)}>
                        {tBooking('plan.editor.apply')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <main id="main-content" className="flex min-h-screen flex-col">
            <Header user={session.user} bookingRequestCtaUrl="/booking-request/plan" />

            <div
                className={cn(
                    'mx-auto grid w-full max-w-7xl flex-1 content-start gap-10 px-4 pb-10 @lg:px-6 @lg:pb-14',
                    step === 'contact' ? 'pt-4 @lg:pt-6' : 'pt-10 @lg:pt-14',
                )}
            >
                {step === 'details' ? (
                    <div className={cn('grid gap-6', venue ? '@xl:grid-cols-[minmax(0,1fr)_auto] @xl:items-start' : null)}>
                        <div className="grid gap-3">
                            {greetingName ? (
                                <p className="text-lg text-muted-foreground">{tBooking('plan.hero.welcome', { name: greetingName })}</p>
                            ) : null}
                            <h1 className="font-serif text-4xl tracking-tight @xl:text-5xl">
                                <span className="block @xl:inline">{tBooking('plan.hero.evening')}</span>{' '}
                                <span className="block @xl:inline">{tBooking('plan.hero.experience')}</span>
                            </h1>
                            <p className="max-w-2xl text-base/relaxed text-muted-foreground">
                                {venue
                                    ? venueCity
                                        ? tBooking('plan.hero.subtitleVenueCity', { city: venueCity })
                                        : tBooking('plan.hero.subtitleVenue')
                                    : tBooking('plan.hero.subtitle')}
                            </p>
                        </div>

                        {venue ? (
                            <div className="flex w-fit max-w-full items-center gap-4 @xl:max-w-md @xl:flex-row-reverse">
                                {venue.firstSectionImageUrl || venue.heroImageUrl ? (
                                    <AppImage
                                        src={venue.firstSectionImageUrl || venue.heroImageUrl || HERO_FALLBACK_SRC}
                                        alt={venue.name}
                                        className="size-18 shrink-0 rounded-xl object-cover"
                                    />
                                ) : null}
                                <div className="min-w-0 text-left @xl:text-right">
                                    <p className="text-sm text-muted-foreground">{tBooking('plan.hero.exclusiveFor')}</p>
                                    <p className="truncate text-base font-medium">{venue.name}</p>
                                    {venueCity ? <p className="truncate text-sm text-muted-foreground">{venueCity}</p> : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div
                    className={cn(
                        'grid items-start gap-10',
                        step === 'details' ? '@5xl:grid-cols-[minmax(0,1fr)_20rem] @6xl:grid-cols-[minmax(0,1fr)_22rem]' : null,
                    )}
                >
                    <div className="grid gap-10">
                        {step === 'details' ? (
                            <>
                                <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs @3xl:grid @3xl:grid-cols-2 @3xl:items-stretch">
                                    <div className="group relative aspect-video overflow-hidden @3xl:aspect-auto @3xl:h-full @3xl:min-h-72">
                                        <AppImage
                                            src={heroSrc}
                                            alt={tBooking('plan.hero.alt')}
                                            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                                        />
                                    </div>
                                    <div className="grid gap-3 p-5 @md:p-6 @3xl:content-center">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="flex items-center gap-0.5"
                                                    role="img"
                                                    aria-label={tBooking('plan.hero.stars')}
                                                >
                                                    {Array.from({ length: 5 }, (_, index) => (
                                                        <StarIcon key={index} aria-hidden className="size-3.5 fill-accent text-accent" />
                                                    ))}
                                                </div>
                                                <span className="text-sm text-muted-foreground">5.0</span>
                                            </div>
                                            {venue && venue.testimonials.length > 0 ? (
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    className="h-auto px-0 text-sm"
                                                    onClick={() => {
                                                        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                                                        document.getElementById('plan-testimonials')?.scrollIntoView({
                                                            behavior: reducedMotion ? 'auto' : 'smooth',
                                                            block: 'start',
                                                        });
                                                    }}
                                                >
                                                    {tBooking('plan.hero.reviews', { count: venue.testimonials.length })}
                                                </Button>
                                            ) : null}
                                        </div>
                                        <h2 className="font-serif text-2xl tracking-tight">{tBooking('plan.hero.placeTitle')}</h2>
                                        <div className="grid gap-2 text-sm/relaxed text-muted-foreground">
                                            <p>{tBooking('plan.hero.placeBody1')}</p>
                                            <p>{tBooking('plan.hero.placeBody2')}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="h-auto w-fit -translate-x-3 justify-start"
                                            onClick={() => setMenuDialogOpen(true)}
                                        >
                                            {tBooking('plan.sampleMenu.discover')}
                                            <ArrowRightIcon className="size-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                        <p className="min-w-0 font-serif text-3xl font-light @md:text-4xl">
                                            {tBooking('plan.dateSection.title')}
                                        </p>
                                        <p className="shrink-0 text-sm text-muted-foreground">{dateChipRangeLabel}</p>
                                    </div>
                                    {useDateChips ? (
                                        <div className="grid grid-cols-3 gap-3 @md:grid-cols-4 @2xl:grid-cols-6">
                                            {selectableDays.map((day, index) => {
                                                const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                                                const selected = key === selectedDayKey;
                                                const languageTag = locale === 'de' ? 'de-DE' : 'en-US';
                                                const weekday = new Intl.DateTimeFormat(languageTag, {
                                                    weekday: 'short',
                                                }).format(day);
                                                const weekdayWithDot = weekday.endsWith('.') ? weekday : `${weekday}.`;
                                                const month = new Intl.DateTimeFormat(languageTag, {
                                                    month: 'short',
                                                }).format(day);
                                                const venueStayLabel = search.venueId
                                                    ? index === 0
                                                        ? tBooking('plan.dateSection.arrival')
                                                        : index === selectableDays.length - 1
                                                          ? tBooking('plan.dateSection.departure')
                                                          : null
                                                    : null;
                                                const footLabel = venueStayLabel ?? month;
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => selectDay(day)}
                                                        aria-pressed={selected}
                                                        className={cn(
                                                            'flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border',
                                                            selectionControlClassName,
                                                            selectionSurfaceClassName(selected),
                                                        )}
                                                    >
                                                        <span className="text-xs leading-none opacity-80">{weekdayWithDot}</span>
                                                        <span className="text-2xl font-medium tabular-nums leading-none">
                                                            {day.getDate()}
                                                        </span>
                                                        <span className="text-xs leading-none opacity-80">{footLabel}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <DatePicker
                                            value={values.dateTime}
                                            onValueChange={(date) => {
                                                if (!date) return;
                                                selectDay(date);
                                            }}
                                            placeholder={tBooking('plan.dateSection.pickDate')}
                                            locale={locale === 'de' ? dateFnsDe : dateFnsEn}
                                            startMonth={datePickerStartMonth}
                                            endMonth={datePickerEndMonth}
                                            disabled={(date) => {
                                                const startOfToday = new Date();
                                                startOfToday.setHours(0, 0, 0, 0);
                                                if (date.getTime() < startOfToday.getTime()) return true;
                                                if (bounds.minDateTime) {
                                                    const minDay = new Date(bounds.minDateTime);
                                                    minDay.setHours(0, 0, 0, 0);
                                                    if (date.getTime() < minDay.getTime()) return true;
                                                }
                                                if (bounds.maxDateTime) {
                                                    const maxDay = new Date(bounds.maxDateTime);
                                                    maxDay.setHours(23, 59, 59, 999);
                                                    if (date.getTime() > maxDay.getTime()) return true;
                                                }
                                                return false;
                                            }}
                                            className="w-full max-w-xs"
                                        />
                                    )}
                                </div>

                                {!venueAddress ? renderLocationPicker() : null}
                                {renderSettingPicker()}

                                {!expectedMenuPriceRangeEnabled ? (
                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <h2 className="font-serif text-3xl font-light @md:text-4xl">{tBooking('plan.price.title')}</h2>
                                            <p className="text-sm text-muted-foreground">{tBooking('plan.price.subtitle')}</p>
                                        </div>
                                        <div className="@container w-full min-w-0">
                                            <div className="grid gap-4 @3xl:grid-cols-3">
                                                {bookingRequestPriceClassTypes.map((priceClass) => {
                                                    const info = bookingRequestPriceClassInfo(priceClass, locale);
                                                    const selected = values.priceClassType === priceClass;
                                                    return (
                                                        <Card
                                                            key={priceClass}
                                                            className={
                                                                selected
                                                                    ? 'h-full justify-between border-primary shadow-md'
                                                                    : 'h-full justify-between border-border'
                                                            }
                                                        >
                                                            <CardHeader>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <CardTitle className="text-xl">{info.title}</CardTitle>
                                                                    {info.isPopular ? (
                                                                        <Badge className="border-green-300 bg-green-100 text-foreground">
                                                                            {tBooking('popular')}
                                                                        </Badge>
                                                                    ) : null}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">{info.description}</p>
                                                            </CardHeader>
                                                            <CardContent className="grid flex-1 content-start gap-2">
                                                                <p className="text-sm text-muted-foreground">
                                                                    {tBooking('form.steps.priceClass.frequentlyBooked')}
                                                                </p>
                                                                <div className="flex flex-wrap items-start gap-2">
                                                                    {info.commonOccasions.map((occasion) => (
                                                                        <Badge key={occasion} variant="outline">
                                                                            {occasion}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </CardContent>
                                                            <CardFooter className="mt-auto flex flex-col items-stretch gap-4">
                                                                <p className="text-center">
                                                                    <span className="text-2xl font-semibold">
                                                                        {tBooking('startingAt')}{' '}
                                                                        {formatCurrency(info.minimumAmountPerPersonCents, { locale })}
                                                                    </span>{' '}
                                                                    <span className="text-sm text-muted-foreground">
                                                                        {tBooking('perPerson')}
                                                                    </span>
                                                                </p>
                                                                <Button
                                                                    type="button"
                                                                    variant={selected ? 'default' : 'outline'}
                                                                    disabled={busy}
                                                                    onClick={() => form.setFieldValue('priceClassType', priceClass)}
                                                                >
                                                                    {selected ? tBooking('selected') : tBooking('select')}
                                                                </Button>
                                                            </CardFooter>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <h2 className="font-serif text-3xl font-light @md:text-4xl">
                                            {tBooking('plan.cuisineSection.title')}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">{tBooking('plan.cuisineSection.subtitle')}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-4">
                                        {bookingRequestPlanCuisineKeys.map((key) => {
                                            const selected = values.cuisine === key;
                                            return (
                                                <div
                                                    key={key}
                                                    className={cn(
                                                        'grid gap-3 rounded-xl border bg-card p-4 text-card-foreground transition-shadow',
                                                        selected ? 'border-primary shadow-md' : 'border-border',
                                                    )}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => form.setFieldValue('cuisine', key)}
                                                        aria-pressed={selected}
                                                        className={cn(
                                                            'flex w-full items-start justify-between gap-3 text-left',
                                                            selectionControlClassName,
                                                        )}
                                                    >
                                                        <span className="grid gap-0.5">
                                                            <span className="font-medium">
                                                                {bookingRequestPlanCuisineLabel(key, locale)}
                                                            </span>
                                                            <span className="text-sm text-muted-foreground">
                                                                {bookingRequestPlanCuisineSubtitle(key, locale)}
                                                            </span>
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                                                                selected
                                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                                    : 'border-border bg-background',
                                                            )}
                                                        >
                                                            {selected ? <CheckIcon className="size-3" /> : null}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            'w-fit text-sm text-muted-foreground underline-offset-4 hover:underline',
                                                            selectionControlClassName,
                                                        )}
                                                        onClick={() => {
                                                            form.setFieldValue('cuisine', key);
                                                            setMenuDialogOpen(true);
                                                        }}
                                                    >
                                                        {tBooking('plan.sampleMenu.link')}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <Reveal>
                                    <BookingRequestPlanForetasteCarousel />
                                </Reveal>

                                <Reveal>
                                    <div className="grid gap-6">
                                        <div className="grid gap-2">
                                            <h2 className="font-serif text-3xl font-light @md:text-4xl">{tBooking('plan.care.title')}</h2>
                                            <p className="max-w-2xl text-sm text-muted-foreground">{tBooking('plan.care.subtitle')}</p>
                                        </div>
                                        <div className="grid items-stretch gap-4 @xl:grid-cols-3">
                                            {CARE_ITEMS.map((item) => {
                                                const Icon = item.icon;
                                                return (
                                                    <div
                                                        key={item.titleKey}
                                                        className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-muted p-5 @xl:p-6"
                                                    >
                                                        <span className="flex size-8 shrink-0 items-center justify-center">
                                                            <Icon className="size-6 text-foreground" strokeWidth={1.5} aria-hidden />
                                                        </span>
                                                        <div className="grid gap-2">
                                                            <p className="font-medium">{tBooking(item.titleKey)}</p>
                                                            <p className="text-sm/relaxed text-muted-foreground">
                                                                {tBooking(item.bodyKey)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </Reveal>

                                {venue && venue.testimonials.length > 0 ? (
                                    <Reveal>
                                        <div id="plan-testimonials">
                                            <SectionPageTestimonials
                                                testimonials={venue.testimonials}
                                                locale={locale}
                                                title={tBooking('plan.testimonials.title')}
                                                inset={false}
                                                columns={2}
                                            />
                                        </div>
                                    </Reveal>
                                ) : null}

                                <Reveal>
                                    <SectionQuestionsAndAnswers
                                        title={tBooking('plan.faqSection.title')}
                                        faqs={planFaqs(locale)}
                                        inset={false}
                                    />
                                </Reveal>
                            </>
                        ) : (
                            <div className="mx-auto grid w-full max-w-md gap-8">
                                <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto w-fit gap-1.5 -mx-2 px-2 text-muted-foreground"
                                    onClick={() => setStep('details')}
                                >
                                    <ArrowLeftIcon aria-hidden />
                                    {tBooking('plan.contact.editSelection')}
                                </Button>

                                <div className="grid gap-3">
                                    <h1 className="font-serif text-3xl tracking-tight">{tBooking('plan.contact.title')}</h1>
                                    <p className="text-muted-foreground">
                                        {venue?.name
                                            ? tBooking('plan.contact.subtitleVenue', { venue: venue.name })
                                            : tBooking('plan.contact.subtitle')}
                                    </p>
                                </div>

                                <div className="grid gap-8">
                                    <form.Field name="originalMessage">
                                        {(field) => (
                                            <label className="grid gap-1.5 text-sm">
                                                <span className="font-medium">{tBooking('plan.contact.wishes')}</span>
                                                <Textarea
                                                    required
                                                    rows={4}
                                                    value={field.state.value}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                    onBlur={field.handleBlur}
                                                    placeholder={tBooking('plan.contact.wishesPlaceholder')}
                                                    disabled={busy}
                                                />
                                            </label>
                                        )}
                                    </form.Field>

                                    {!startedSignedIn ? (
                                        <div className="grid gap-4">
                                            <h2 className="text-lg font-medium">{tBooking('plan.contact.contactDetails')}</h2>
                                            <AuthIdentityGate
                                                initialSession={session}
                                                onSessionChange={setSession}
                                                onBusyChange={setAuthBusy}
                                                profileInitialValues={search.firstName ? { firstName: search.firstName } : undefined}
                                                registerHeading={null}
                                                submitLabel={tBooking('plan.contact.send')}
                                                onReady={() => {
                                                    void submitBooking();
                                                }}
                                                footer={(gateSession, sessionRefresh) => (
                                                    <AuthIdentityGateLogOnFooter session={gateSession} sessionRefresh={sessionRefresh} />
                                                )}
                                            >
                                                {() => (
                                                    <div className="grid gap-3">
                                                        <Button
                                                            type="button"
                                                            size="lg"
                                                            className="w-full"
                                                            disabled={busy || authBusy || values.originalMessage.trim().length === 0}
                                                            onClick={() => void submitBooking()}
                                                        >
                                                            {busy ? tBooking('plan.contact.sending') : tBooking('plan.contact.send')}
                                                            {!busy ? <ArrowRightIcon className="size-4" /> : null}
                                                        </Button>
                                                        <p className="text-xs text-muted-foreground">
                                                            {tBooking('plan.contact.nonBinding')}
                                                        </p>
                                                    </div>
                                                )}
                                            </AuthIdentityGate>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            <Button
                                                type="button"
                                                size="lg"
                                                className="w-full"
                                                disabled={busy || authBusy || values.originalMessage.trim().length === 0}
                                                onClick={() => void submitBooking()}
                                            >
                                                {tBooking('plan.contact.send')}
                                                <ArrowRightIcon className="size-4" />
                                            </Button>
                                            <p className="text-xs text-muted-foreground">{tBooking('plan.contact.nonBinding')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {step === 'details' ? <div className="hidden @5xl:sticky @5xl:top-20 @5xl:block">{summaryCard}</div> : null}
                </div>
            </div>

            {step === 'details' ? (
                <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur @5xl:hidden">
                    <div className="mx-auto flex max-w-7xl items-center gap-4">
                        <button
                            type="button"
                            className={cn(
                                'min-w-0 flex-1 rounded-lg py-1 text-left',
                                selectionControlClassName,
                                'hover:bg-muted/60 active:bg-muted/80',
                            )}
                            onClick={() => setDetailsEditorOpen(true)}
                            aria-label={tBooking('plan.summary.editDetails')}
                        >
                            <span className="grid min-w-0 gap-0.5">
                                <span className="truncate text-sm font-medium">{tBooking('plan.bar.guests', { count: guestCount })}</span>
                                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                    {expectedMenuPriceRangeEnabled ? (
                                        <span className="inline-flex h-4 min-w-20 items-center">
                                            {displayExpectedPriceRangeLabel ? (
                                                <span className="truncate leading-4">{displayExpectedPriceRangeLabel}</span>
                                            ) : (
                                                <Skeleton className="h-3 w-20 motion-reduce:animate-none" aria-hidden />
                                            )}
                                        </span>
                                    ) : (
                                        <span className="truncate">{priceInfo.title}</span>
                                    )}
                                    <span className="inline-flex shrink-0 items-center gap-1 underline-offset-2 hover:underline">
                                        {tBooking('plan.bar.edit')}
                                        <PencilIcon className="size-3 shrink-0" aria-hidden />
                                    </span>
                                </span>
                            </span>
                        </button>
                        <Button type="button" className="shrink-0" onClick={goToContact} disabled={!canContinueToContact()}>
                            {tBooking('next')}
                        </Button>
                    </div>
                </div>
            ) : null}

            <Footer />

            {detailsEditor}

            <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
                <DialogContent className="max-w-xl gap-8 p-8 sm:p-10">
                    <DialogHeader className="gap-3">
                        <DialogTitle>{sampleMenu.title}</DialogTitle>
                        <DialogDescription>{sampleMenu.description}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-7">
                        {sampleMenu.courses.map((course) => (
                            <div key={course.course} className="border-t border-border pt-6 first:border-t-0 first:pt-0">
                                <p className="text-xs tracking-wide text-muted-foreground uppercase">{course.course}</p>
                                <p className="mt-2 font-medium">{course.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={() => setMenuDialogOpen(false)}>
                            {tBooking('plan.sampleMenu.back')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
