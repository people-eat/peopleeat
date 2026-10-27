import { useForm, useSelector } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { de as dateFnsDe, enUS as dateFnsEn } from 'date-fns/locale';
import { ArrowRightIcon, CheckIcon, MinusIcon, PencilIcon, PlusIcon, ShoppingBagIcon, SparklesIcon, UtensilsIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { bookingRequestPriceClassInfo, formatCurrency, formatDate, formatTime } from '../../shared';
import { AppImage } from '../components/AppImage';
import { AuthIdentityGate } from '../components/auth/AuthIdentityGate';
import { AuthPasskeyLogOn } from '../components/auth/AuthPasskeyLogOn';
import { sessionAuthPhase } from '../components/auth/sessionAuthPhase';
import { Button } from '../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../components/base/combobox';
import { DatePicker } from '../components/base/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/base/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/base/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../components/base/sheet';
import { Textarea } from '../components/base/textarea';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import type {
    GqlCBookingRequestPlanPageQuery,
    GqlCLocationSuggestion,
    GqlCUserBookingRequestCreate,
    GqlCUserBookingRequestExactEventAddressInput,
} from '../graphql/generated';
import { BookingRequestPlanCreateDocument, BookingRequestPlanLocationSuggestionsDocument } from '../graphql/generated';
import { useIsMobile } from '../hooks/use-mobile';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
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
    bookingRequestPlanCuisineKeys,
    bookingRequestPlanCuisineLabel,
    bookingRequestPlanCuisinePreference,
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
    {
        src: '/booking-request/plan/foretaste-1.png',
        caption: { de: 'Ein genussvoller Auftakt.', en: 'A delicious opening.' },
    },
    {
        src: '/booking-request/plan/foretaste-2.jpg',
        caption: { de: 'Drei Gänge. Ganz für euch.', en: 'Three courses. Just for you.' },
    },
    {
        src: '/booking-request/plan/foretaste-3.png',
        caption: { de: 'Ein süßer Abschluss.', en: 'A sweet finish.' },
    },
    {
        src: '/booking-request/plan/foretaste-4.jpg',
        caption: { de: 'Mit Liebe zum Detail.', en: 'With love for detail.' },
    },
    {
        src: '/booking-request/plan/foretaste-5.jpg',
        caption: { de: 'Euer Tisch im Loft.', en: 'Your table at the loft.' },
    },
] as const;

const CARE_ITEMS: ReadonlyArray<{
    icon: LucideIcon;
    de: { title: string; body: string };
    en: { title: string; body: string };
}> = [
    {
        icon: ShoppingBagIcon,
        de: {
            title: 'Alles vorbereitet.',
            body: 'Euer Chef besorgt die Zutaten. Ihr habt Zeit für euch und die Kinder.',
        },
        en: {
            title: 'Everything prepared.',
            body: 'Your chef gets the ingredients. You have time for yourselves and the children.',
        },
    },
    {
        icon: UtensilsIcon,
        de: {
            title: 'Für euch gekocht.',
            body: 'Drei Gänge, frisch im Loft zubereitet und an eurem Tisch serviert.',
        },
        en: {
            title: 'Cooked for you.',
            body: 'Three courses, freshly prepared in the loft and served at your table.',
        },
    },
    {
        icon: SparklesIcon,
        de: {
            title: 'Sauber hinterlassen.',
            body: 'Euer Chef räumt die Küche auf. Ihr lasst den Abend ausklingen.',
        },
        en: {
            title: 'Left clean.',
            body: 'Your chef cleans up the kitchen. You let the evening wind down.',
        },
    },
];

type PlanSession = GqlCBookingRequestPlanPageQuery['currentSession'];
type PlanPartner = NonNullable<GqlCBookingRequestPlanPageQuery['publicPartner']['findOne']>;

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

function partnerDefaultAddress(partner: PlanPartner | null | undefined): GqlCUserBookingRequestExactEventAddressInput | null {
    if (!partner?.locationAddress) return null;
    const address = partner.locationAddress;
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

function planFaqs(locale: 'de' | 'en'): ReadonlyArray<QuestionsAndAnswersEntry> {
    return [
        {
            question: { de: 'Was ist im Service enthalten?', en: 'What is included in the service?' }[locale],
            answer: {
                de: 'Persönliche Menüabstimmung, Einkauf, frische Zubereitung vor Ort, Servieren der drei Gänge und eine saubere Küche danach.',
                en: 'Personal menu coordination, grocery shopping, fresh on-site cooking, serving three courses, and a clean kitchen afterward.',
            }[locale],
        },
        {
            question: { de: 'Wie geht es nach der Anfrage weiter?', en: 'What happens after the request?' }[locale],
            answer: {
                de: 'Wir prüfen die Verfügbarkeit und stimmen das Menü mit euch ab. Danach erhaltet ihr die finale Buchungsbestätigung, sobald Chef und Termin bestätigt sind.',
                en: 'We check availability and align the menu with you. You then get the final booking confirmation once chef and date are confirmed.',
            }[locale],
        },
        {
            question: {
                de: 'Allergien, Kinder und besondere Wünsche',
                en: 'Allergies, children, and special wishes',
            }[locale],
            answer: {
                de: 'Ergänzt Wünsche im nächsten Schritt. Allergien klären wir vor der Bestätigung mit dem Chef. Kinderportionen sind in der Regel günstiger.',
                en: 'Add wishes in the next step. We clarify allergies with the chef before confirmation. Children portions are usually priced lower.',
            }[locale],
        },
        {
            question: { de: 'Was kostet euer Dinner?', en: 'What does your dinner cost?' }[locale],
            answer: {
                de: 'Die angezeigten Beträge sind Beispielpreise ab dem Signature-Menü. Das finale Angebot setzt euer Chef. Es erfolgt noch keine Zahlung bei der Anfrage.',
                en: 'Shown amounts are example prices starting from the Signature menu. Your chef sets the final offer. No payment is taken with the request.',
            }[locale],
        },
    ];
}

function sampleMenuCourses(cuisine: BookingRequestPlanCuisineKey, locale: 'de' | 'en') {
    const menus = {
        mediterranean: {
            de: [
                {
                    course: 'Vorspeise',
                    title: 'Burrata, Tomaten & Basilikum',
                    description: 'Mit geröstetem Brot und Olivenöl',
                },
                {
                    course: 'Hauptgang',
                    title: 'Gegrillter Fisch, Gemüse & Zitronenrisotto',
                    description: 'Vegetarische Alternative: gegrilltes Gemüse',
                },
                {
                    course: 'Dessert',
                    title: 'Panna Cotta mit Beeren',
                    description: 'Frisch und leicht zum Abschluss',
                },
            ],
            en: [
                {
                    course: 'Starter',
                    title: 'Burrata, tomatoes & basil',
                    description: 'With toasted bread and olive oil',
                },
                {
                    course: 'Main',
                    title: 'Grilled fish, vegetables & lemon risotto',
                    description: 'Vegetarian alternative: grilled vegetables',
                },
                {
                    course: 'Dessert',
                    title: 'Panna cotta with berries',
                    description: 'A fresh, light finish',
                },
            ],
        },
        regional: {
            de: [
                {
                    course: 'Vorspeise',
                    title: 'Saisonale Suppe mit Kräutern',
                    description: 'Aus regionalen Zutaten',
                },
                {
                    course: 'Hauptgang',
                    title: 'Braten vom Hof, Knöterich & Beilagen',
                    description: 'Vegetarische Alternative: Ofengemüse',
                },
                {
                    course: 'Dessert',
                    title: 'Apfeltarte mit Vanille',
                    description: 'Ein klassischer Abschluss',
                },
            ],
            en: [
                {
                    course: 'Starter',
                    title: 'Seasonal soup with herbs',
                    description: 'Made with regional produce',
                },
                {
                    course: 'Main',
                    title: 'Farm roast, greens & sides',
                    description: 'Vegetarian alternative: roasted vegetables',
                },
                {
                    course: 'Dessert',
                    title: 'Apple tart with vanilla',
                    description: 'A classic finish',
                },
            ],
        },
        asian: {
            de: [
                {
                    course: 'Vorspeise',
                    title: 'Gurkensalat, Sesam & frische Kräuter',
                    description: 'Mit Limetten-Dressing und knusprigen Akzenten',
                },
                {
                    course: 'Hauptgang',
                    title: 'Miso-Lachs, grünes Gemüse & Jasminreis',
                    description: 'Vegetarische Alternative: knuspriger Tofu',
                },
                {
                    course: 'Dessert',
                    title: 'Kokoscreme, Mango & Limette',
                    description: 'Ein frischer Abschluss mit tropischen Aromen',
                },
            ],
            en: [
                {
                    course: 'Starter',
                    title: 'Cucumber salad, sesame & fresh herbs',
                    description: 'With lime dressing and crispy accents',
                },
                {
                    course: 'Main',
                    title: 'Miso salmon, greens & jasmine rice',
                    description: 'Vegetarian alternative: crispy tofu',
                },
                {
                    course: 'Dessert',
                    title: 'Coconut cream, mango & lime',
                    description: 'A fresh finish with tropical notes',
                },
            ],
        },
        chef: {
            de: [
                {
                    course: 'Vorspeise',
                    title: 'Überraschungsgang nach Saison',
                    description: 'Euer Chef stimmt den Auftakt mit euch ab',
                },
                {
                    course: 'Hauptgang',
                    title: 'Signature-Hauptgericht',
                    description: 'Passend zu Vorlieben und Ernährungswünschen',
                },
                {
                    course: 'Dessert',
                    title: 'Passender Süßabschluss',
                    description: 'Frisch und persönlich abgestimmt',
                },
            ],
            en: [
                {
                    course: 'Starter',
                    title: 'Seasonal surprise course',
                    description: 'Your chef aligns the opening with you',
                },
                {
                    course: 'Main',
                    title: 'Signature main',
                    description: 'Matched to preferences and dietary needs',
                },
                {
                    course: 'Dessert',
                    title: 'A fitting sweet finish',
                    description: 'Fresh and personally coordinated',
                },
            ],
        },
    } as const;
    return menus[cuisine][locale];
}

function buildCreateMessage(values: BookingRequestPlanValues, locale: 'de' | 'en'): string {
    const cuisine = bookingRequestPlanCuisineLabel(values.cuisine, locale);
    const notes = values.originalMessage.trim();
    if (notes.length > 0) {
        return {
            de: `Menürichtung: ${cuisine}.\n\n${notes}`,
            en: `Cuisine direction: ${cuisine}.\n\n${notes}`,
        }[locale];
    }
    return {
        de: `Anfrage über die Dinner-Planung. Menürichtung: ${cuisine}.`,
        en: `Request via dinner planning. Cuisine direction: ${cuisine}.`,
    }[locale];
}

function createInputFromValues(values: BookingRequestPlanValues, locale: 'de' | 'en'): GqlCUserBookingRequestCreate | null {
    if (!values.exactEventAddress) return null;
    if (values.adultCount < 1) return null;
    const occasion =
        values.occasion.trim() ||
        {
            de: 'Familienfest',
            en: 'Family Party',
        }[locale];
    const participants: GqlCUserBookingRequestCreate['participants'] = [
        ...Array.from({ length: values.adultCount }, () => ({
            type: 'ADULT' as const,
            name: '',
            restrictions: [] as string[],
        })),
        ...Array.from({ length: values.discountedCount }, () => ({
            type: 'DISCOUNTED' as const,
            name: '',
            restrictions: [] as string[],
        })),
    ];
    return {
        occasion,
        dateTime: values.dateTime.toISOString(),
        exactEventAddress: values.exactEventAddress,
        originalMessage: buildCreateMessage(values, locale),
        preferences: [bookingRequestPlanCuisinePreference(values.cuisine, locale)],
        participants,
        priceClassType: 'MEDIUM',
        redeemCode: values.redeemCode.trim() || null,
    };
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
    subtitle: string;
    value: number;
    min: number;
    disabled: boolean;
    onChange: (next: number) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="grid gap-0.5">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{subtitle}</span>
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

export function BookingRequestPlanPage({
    loaderData,
    search,
}: {
    loaderData: GqlCBookingRequestPlanPageQuery;
    search: BookingRequestPlanSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/booking-request/plan' });
    const [session, setSession] = useState<PlanSession>(loaderData.currentSession);
    const partner = loaderData.publicPartner.findOne ?? null;
    const signedIn = sessionAuthPhase(session) === 'signedIn';
    const [step, setStep] = useState<BookingRequestPlanStep>(() => (search.step === 'contact' ? 'contact' : 'details'));
    const [detailsEditorOpen, setDetailsEditorOpen] = useState(false);
    const isMobile = useIsMobile();
    const [menuDialogOpen, setMenuDialogOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const createStarted = useRef(false);

    const partnerAddress = useMemo(() => partnerDefaultAddress(partner), [partner]);
    const [seeded] = useState(() => bookingRequestPlanValuesFromSearch(search, partnerAddress));

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
    const priceInfo = bookingRequestPriceClassInfo('MEDIUM', locale);
    const softPrice = formatCurrency(priceInfo.minimumAmountPerPersonCents, { locale });

    const greetingName = search.firstName?.trim() || session.user?.firstName?.trim() || '';
    const heroSrc = partner?.firstSectionImageUrl || partner?.heroImageUrl || HERO_FALLBACK_SRC;
    const partnerCity = values.exactEventAddress?.city || partnerAddress?.city || '';

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
            partnerId: search.partnerId,
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
        address: values.exactEventAddress?.displayText ?? null,
        location: values.locationSearchText,
        message: values.originalMessage,
        redeemCode: values.redeemCode,
        occasion: values.occasion,
        step,
    });
    const debouncedDraftKey = useDebouncedValue(draftKey, 250);

    useEffect(() => {
        syncSearch(values, step);
    }, [debouncedDraftKey, syncSearch, values, step]);

    useEffect(() => {
        if (partner?.promo?.redeemCode && !values.redeemCode) {
            form.setFieldValue('redeemCode', partner.promo.redeemCode);
        }
    }, [partner?.promo?.redeemCode, form, values.redeemCode]);

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

    function canContinueToContact(): boolean {
        return values.exactEventAddress != null && values.adultCount >= 1;
    }

    function goToContact() {
        if (!canContinueToContact()) {
            toast.error(
                {
                    de: 'Bitte Datum, Gäste und Adresse vervollständigen.',
                    en: 'Please complete date, guests, and address.',
                }[locale],
            );
            return;
        }
        setStep('contact');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function submitBooking() {
        if (createStarted.current) return;
        const input = createInputFromValues(values, locale);
        if (!input) {
            toast.error(
                {
                    de: 'Bitte alle Pflichtfelder ausfüllen.',
                    en: 'Please complete all required fields.',
                }[locale],
            );
            return;
        }
        createStarted.current = true;
        setBusy(true);
        try {
            const result = await createBooking({ input });
            const created = result.data?.user.bookingRequestCreate;
            if (result.error || !created?.success || !created.referenceId) {
                createStarted.current = false;
                toast.error({ de: 'Anfrage konnte nicht erstellt werden.', en: 'Could not create the booking request.' }[locale]);
                return;
            }
            toast.success({ de: 'Buchungsanfrage erstellt.', en: 'Booking request created.' }[locale]);
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

    const summaryCard = (
        <aside
            className={cn('rounded-xl border border-border bg-card p-5 shadow-xs', 'lg:sticky lg:top-20')}
            aria-label={{ de: 'Eure Auswahl', en: 'Your selection' }[locale]}
        >
            <p className="font-serif text-xl tracking-tight">{{ de: 'Eure Auswahl', en: 'Your selection' }[locale]}</p>
            <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{{ de: 'Datum', en: 'Date' }[locale]}</dt>
                    <dd className="text-right font-medium">
                        {formatDate(values.dateTime, { locale, weekday: true, dateStyle: 'medium' })}
                    </dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{{ de: 'Gäste', en: 'Guests' }[locale]}</dt>
                    <dd className="text-right font-medium">
                        {
                            {
                                de: `${values.adultCount} Erwachsene${values.discountedCount > 0 ? ` · ${values.discountedCount} Kinder` : ''}`,
                                en: `${values.adultCount} adults${values.discountedCount > 0 ? ` · ${values.discountedCount} children` : ''}`,
                            }[locale]
                        }
                    </dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{{ de: 'Menübeginn', en: 'Menu start' }[locale]}</dt>
                    <dd className="text-right font-medium">{formatTime(values.dateTime, { locale })}</dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{{ de: 'Menürichtung', en: 'Cuisine' }[locale]}</dt>
                    <dd className="text-right font-medium">{bookingRequestPlanCuisineLabel(values.cuisine, locale)}</dd>
                </div>
            </dl>

            <Button type="button" variant="ghost" size="sm" className="mt-3 px-0" onClick={() => setDetailsEditorOpen(true)}>
                <PencilIcon className="size-3.5" />
                {{ de: 'Angaben bearbeiten', en: 'Edit details' }[locale]}
            </Button>

            <p className="mt-3 text-sm text-muted-foreground">{bookingRequestPlanChefArrivalHint(values.dateTime, locale)}</p>

            <div className="mt-5 border-t border-border pt-4">
                <p className="text-lg font-medium">{{ de: `ab ${softPrice} p.P.`, en: `from ${softPrice} p.p.` }[locale]}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    {
                        {
                            de: 'Beispielpreis Signature-Menü. Finales Angebot setzt euer Chef. Kinderportionen günstiger.',
                            en: 'Example Signature menu price. Your chef sets the final offer. Children portions cost less.',
                        }[locale]
                    }
                </p>
            </div>

            {values.exactEventAddress ? (
                <div className="mt-4 border-t border-border pt-4 text-sm">
                    <p className="font-medium">{{ de: 'Adresse', en: 'Address' }[locale]}</p>
                    <p className="mt-1 text-muted-foreground">{values.exactEventAddress.displayText}</p>
                </div>
            ) : null}

            <div className="mt-5 grid gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                    <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                        {{ de: 'Noch Fragen? Talk to us', en: 'Still questions? Talk to us' }[locale]}
                    </a>
                </Button>
                {step === 'details' ? (
                    <Button type="button" size="lg" className="w-full" onClick={goToContact} disabled={!canContinueToContact()}>
                        {{ de: 'Weiter zur Anfrage', en: 'Continue to request' }[locale]}
                        <ArrowRightIcon className="size-4" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        size="lg"
                        className="w-full"
                        disabled={busy || authBusy || !signedIn}
                        onClick={() => void submitBooking()}
                    >
                        {{ de: 'Buchungsanfrage senden', en: 'Send booking request' }[locale]}
                        <ArrowRightIcon className="size-4" />
                    </Button>
                )}
                <p className="text-center text-xs text-muted-foreground">
                    {{ de: 'Unverbindlich. Noch keine Zahlung.', en: 'Non-binding. No payment yet.' }[locale]}
                </p>
            </div>
        </aside>
    );

    const detailsEditorFields = (
        <div className="grid gap-6">
            <ParticipantCountField
                label={{ de: 'Erwachsene', en: 'Adults' }[locale]}
                subtitle={{ de: `ab ${softPrice} pro Person`, en: `from ${softPrice} per person` }[locale]}
                value={values.adultCount}
                min={1}
                disabled={busy}
                onChange={(next) => form.setFieldValue('adultCount', next)}
            />
            <ParticipantCountField
                label={{ de: 'Kinder', en: 'Children' }[locale]}
                subtitle={
                    {
                        de: '4–12 Jahre · Kinderportionen günstiger',
                        en: 'Ages 4–12 · children portions cost less',
                    }[locale]
                }
                value={values.discountedCount}
                min={0}
                disabled={busy}
                onChange={(next) => form.setFieldValue('discountedCount', next)}
            />
            <div className="grid gap-2">
                <span className="text-sm font-medium">{{ de: 'Menübeginn', en: 'Menu start' }[locale]}</span>
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
                <span className="text-sm font-medium">{{ de: 'Menürichtung', en: 'Cuisine' }[locale]}</span>
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
        </div>
    );

    const detailsEditor = isMobile ? (
        <Sheet open={detailsEditorOpen} onOpenChange={setDetailsEditorOpen}>
            <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                    <SheetTitle>{{ de: 'Euer Abend im Detail.', en: 'Your evening in detail.' }[locale]}</SheetTitle>
                    <SheetDescription>
                        {{ de: 'Gäste, Startzeit und Menürichtung', en: 'Guests, start time, and cuisine' }[locale]}
                    </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-2">{detailsEditorFields}</div>
                <SheetFooter>
                    <Button type="button" className="w-full" onClick={() => setDetailsEditorOpen(false)}>
                        {{ de: 'Übernehmen', en: 'Apply' }[locale]}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    ) : (
        <Dialog open={detailsEditorOpen} onOpenChange={setDetailsEditorOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ de: 'Euer Abend im Detail.', en: 'Your evening in detail.' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {{ de: 'Gäste, Startzeit und Menürichtung', en: 'Guests, start time, and cuisine' }[locale]}
                    </DialogDescription>
                </DialogHeader>
                {detailsEditorFields}
                <DialogFooter>
                    <Button type="button" className="w-full" onClick={() => setDetailsEditorOpen(false)}>
                        {{ de: 'Übernehmen', en: 'Apply' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <main id="main-content" className="flex min-h-screen flex-col">
            <Header user={session.user} bookingRequestCtaUrl="/booking-request/plan" />

            <div className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-10 px-4 py-10 @lg:px-6 @lg:py-14">
                {step === 'contact' ? (
                    <button
                        type="button"
                        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
                        onClick={() => setStep('details')}
                    >
                        {{ de: '← Auswahl bearbeiten', en: '← Edit selection' }[locale]}
                    </button>
                ) : null}

                {step === 'details' ? (
                    <div className={cn('grid gap-6', partner ? '@lg:grid-cols-[minmax(0,1fr)_auto] @lg:items-start' : null)}>
                        <div className="grid gap-3">
                            {greetingName ? (
                                <p className="text-sm text-muted-foreground">
                                    {{ de: `Willkommen, ${greetingName}.`, en: `Welcome, ${greetingName}.` }[locale]}
                                </p>
                            ) : null}
                            <h1 className="font-serif text-4xl tracking-tight @md:text-5xl">
                                {{ de: 'Euer Abend. Eure Experience.', en: 'Your evening. Your experience.' }[locale]}
                            </h1>
                            <p className="max-w-2xl text-base/relaxed text-muted-foreground">
                                {partner
                                    ? {
                                          de: `Euer privates 3-Gänge-Dinner${partnerCity ? ` in ${partnerCity}` : ''}, als optionales Upgrade. Einkauf, Kochen und Aufräumen sind inklusive.`,
                                          en: `Your private three-course dinner${partnerCity ? ` in ${partnerCity}` : ''} as an optional upgrade. Shopping, cooking, and cleanup included.`,
                                      }[locale]
                                    : {
                                          de: 'Euer privates 3-Gänge-Dinner mit Privatkoch. Einkauf, Kochen und Aufräumen sind inklusive.',
                                          en: 'Your private three-course dinner with a private chef. Shopping, cooking, and cleanup included.',
                                      }[locale]}
                            </p>
                        </div>

                        {partner ? (
                            <Link
                                to="/{-$locale}/partners/$pathName"
                                params={{ pathName: partner.pathName }}
                                className={cn(
                                    'flex max-w-sm items-center gap-3 rounded-xl border border-border bg-secondary/60 p-3 @lg:w-64',
                                    selectionControlClassName,
                                    'hover:bg-muted active:bg-muted/80',
                                )}
                            >
                                {partner.firstSectionImageUrl || partner.heroImageUrl ? (
                                    <AppImage
                                        src={partner.firstSectionImageUrl || partner.heroImageUrl || HERO_FALLBACK_SRC}
                                        alt={partner.name}
                                        className="size-14 shrink-0 rounded-lg object-cover"
                                    />
                                ) : null}
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                        {{ de: 'Exklusiv für Gäste bei', en: 'Exclusive for guests at' }[locale]}
                                    </p>
                                    <p className="truncate font-medium">{partner.name}</p>
                                    {partnerCity ? <p className="truncate text-sm text-muted-foreground">{partnerCity}</p> : null}
                                </div>
                            </Link>
                        ) : null}
                    </div>
                ) : null}

                <div className="grid items-start gap-10 @lg:grid-cols-[minmax(0,1fr)_20rem] @xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="grid gap-10">
                        {step === 'details' ? (
                            <>
                                <div className="grid gap-3">
                                    <p className="text-sm font-medium">{{ de: 'Dinner-Datum', en: 'Dinner date' }[locale]}</p>
                                    {useDateChips ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectableDays.map((day) => {
                                                const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                                                const selected = key === selectedDayKey;
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => selectDay(day)}
                                                        aria-pressed={selected}
                                                        className={cn(
                                                            'flex size-16 flex-col items-center justify-center rounded-xl border text-sm',
                                                            selectionControlClassName,
                                                            selectionSurfaceClassName(selected),
                                                        )}
                                                    >
                                                        <span className="text-[0.65rem] leading-none opacity-80">
                                                            {new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
                                                                weekday: 'short',
                                                            }).format(day)}
                                                        </span>
                                                        <span className="font-medium tabular-nums">{day.getDate()}</span>
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
                                            placeholder={{ de: 'Datum wählen', en: 'Choose a date' }[locale]}
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

                                <div className="overflow-hidden rounded-2xl border border-border">
                                    <AppImage
                                        src={heroSrc}
                                        alt={
                                            {
                                                de: 'Gedeckter Tisch für euer Dinner',
                                                en: 'Set table for your dinner',
                                            }[locale]
                                        }
                                        className="aspect-video w-full object-cover"
                                    />
                                    <div className="grid gap-3 p-5 @md:p-6">
                                        <p className="text-sm text-muted-foreground">
                                            ★ 5.0 · {{ de: 'Private Dinner', en: 'Private dinner' }[locale]}
                                        </p>
                                        <h2 className="font-serif text-2xl tracking-tight">
                                            {
                                                {
                                                    de: 'Euer Ort wird zum Lieblingsrestaurant.',
                                                    en: 'Your place becomes your favorite restaurant.',
                                                }[locale]
                                            }
                                        </h2>
                                        <p className="text-sm/relaxed text-muted-foreground">
                                            {
                                                {
                                                    de: 'Drei Gänge, abgestimmt auf eure Wünsche. Einkauf, Zubereitung und Aufräumen inklusive.',
                                                    en: 'Three courses tailored to your wishes. Shopping, cooking, and cleanup included.',
                                                }[locale]
                                            }
                                        </p>
                                        <p className="font-medium">
                                            {{ de: `ab ${softPrice} / Erwachsener`, en: `from ${softPrice} / adult` }[locale]}
                                        </p>
                                        <button
                                            type="button"
                                            className="w-fit text-sm font-medium underline-offset-4 hover:underline"
                                            onClick={() => setMenuDialogOpen(true)}
                                        >
                                            {{ de: 'Beispielmenü entdecken →', en: 'Discover sample menu →' }[locale]}
                                        </button>
                                    </div>
                                </div>

                                {!values.exactEventAddress ? (
                                    <div className="grid gap-2">
                                        <p className="text-sm font-medium">{{ de: 'Adresse', en: 'Address' }[locale]}</p>
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
                                                    toast.error(
                                                        {
                                                            de: 'Bitte eine vollständige Adresse wählen.',
                                                            en: 'Please choose a full address.',
                                                        }[locale],
                                                    );
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
                                                placeholder={
                                                    {
                                                        de: 'Musterstraße 1, 80331 München',
                                                        en: '123 Main Street, 12345 Springfield',
                                                    }[locale]
                                                }
                                                showClear={false}
                                                required={!values.exactEventAddress}
                                            />
                                            <ComboboxContent>
                                                <ComboboxEmpty>
                                                    {suggestionsFetching
                                                        ? { de: 'Suche…', en: 'Searching…' }[locale]
                                                        : { de: 'Keine Treffer.', en: 'No matches.' }[locale]}
                                                </ComboboxEmpty>
                                                <ComboboxList>
                                                    {(item: string) => (
                                                        <ComboboxItem key={item} value={item}>
                                                            {item}
                                                        </ComboboxItem>
                                                    )}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                    </div>
                                ) : null}

                                <div className="grid gap-4">
                                    <h2 className="font-serif text-2xl tracking-tight">
                                        {
                                            {
                                                de: 'Welche Küche macht euren Abend besonders?',
                                                en: 'Which cuisine makes your evening special?',
                                            }[locale]
                                        }
                                    </h2>
                                    <div className="grid gap-3 @sm:grid-cols-2">
                                        {bookingRequestPlanCuisineKeys.map((key) => {
                                            const selected = values.cuisine === key;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => form.setFieldValue('cuisine', key)}
                                                    aria-pressed={selected}
                                                    className={cn(
                                                        'flex items-start gap-3 rounded-xl border p-4 text-left',
                                                        selectionControlClassName,
                                                        selected
                                                            ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80'
                                                            : 'border-border bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted/80',
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                                                            selected
                                                                ? 'border-primary-foreground/40 bg-primary-foreground text-primary'
                                                                : 'border-border bg-background',
                                                        )}
                                                    >
                                                        {selected ? <CheckIcon className="size-3" /> : null}
                                                    </span>
                                                    <span className="font-medium">{bookingRequestPlanCuisineLabel(key, locale)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <Reveal>
                                    <div className="grid gap-4">
                                        <h2 className="font-serif text-2xl tracking-tight">
                                            {{ de: 'Ein Vorgeschmack auf euren Abend', en: 'A taste of your evening' }[locale]}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {
                                                {
                                                    de: 'Frisch gekocht. Mit Liebe serviert. Gemeinsam genossen.',
                                                    en: 'Freshly cooked. Served with care. Enjoyed together.',
                                                }[locale]
                                            }
                                        </p>
                                        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 @md:grid @md:grid-cols-5 @md:overflow-visible">
                                            {FORETASTE_ITEMS.map((item) => (
                                                <figure
                                                    key={item.src}
                                                    className="relative aspect-3/4 w-40 shrink-0 overflow-hidden rounded-xl @md:w-auto"
                                                >
                                                    <AppImage
                                                        src={item.src}
                                                        alt={item.caption[locale]}
                                                        className="absolute inset-0 size-full object-cover"
                                                    />
                                                    <div
                                                        className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/35 to-transparent px-3 pt-10 pb-3"
                                                        aria-hidden
                                                    />
                                                    <figcaption className="absolute inset-x-0 bottom-0 px-3 pb-3 text-sm font-medium text-white">
                                                        {item.caption[locale]}
                                                    </figcaption>
                                                </figure>
                                            ))}
                                        </div>
                                    </div>
                                </Reveal>

                                <Reveal>
                                    <div className="grid gap-6">
                                        <div className="grid gap-2">
                                            <h2 className="text-2xl font-medium tracking-tight text-foreground">
                                                {{ de: 'Ihr genießt. Wir kümmern uns.', en: 'You enjoy. We take care.' }[locale]}
                                            </h2>
                                            <p className="max-w-2xl text-sm text-muted-foreground">
                                                {
                                                    {
                                                        de: 'Mehr Zeit für die Familie. Einkauf, Zubereitung und Reinigung sind inklusive.',
                                                        en: 'More time for the family. Shopping, preparation, and cleaning are included.',
                                                    }[locale]
                                                }
                                            </p>
                                        </div>
                                        <div className="grid items-stretch gap-4 @md:grid-cols-3">
                                            {CARE_ITEMS.map((item) => {
                                                const Icon = item.icon;
                                                return (
                                                    <div
                                                        key={item.de.title}
                                                        className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-muted p-5 @md:p-6"
                                                    >
                                                        <span className="flex size-8 shrink-0 items-center justify-center">
                                                            <Icon className="size-6 text-foreground" strokeWidth={1.5} aria-hidden />
                                                        </span>
                                                        <div className="grid gap-2">
                                                            <p className="font-medium">{item[locale].title}</p>
                                                            <p className="text-sm/relaxed text-muted-foreground">{item[locale].body}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </Reveal>

                                {partner && partner.testimonials.length > 0 ? (
                                    <Reveal>
                                        <SectionPageTestimonials
                                            testimonials={partner.testimonials}
                                            locale={locale}
                                            title={{ de: 'Abende, die bleiben.', en: 'Evenings that stay with you.' }[locale]}
                                            inset={false}
                                        />
                                    </Reveal>
                                ) : null}

                                <Reveal>
                                    <SectionQuestionsAndAnswers
                                        title={{ de: 'Gut zu wissen.', en: 'Good to know.' }[locale]}
                                        faqs={planFaqs(locale)}
                                        inset={false}
                                    />
                                </Reveal>
                            </>
                        ) : (
                            <div className="grid gap-8">
                                <div className="grid gap-3">
                                    <h1 className="font-serif text-3xl tracking-tight @md:text-4xl">
                                        {
                                            {
                                                de: 'Ein Schritt näher an eurem Dinner.',
                                                en: 'One step closer to your dinner.',
                                            }[locale]
                                        }
                                    </h1>
                                    <p className="max-w-2xl text-muted-foreground">
                                        {partner
                                            ? {
                                                  de: `Euer Abend${partner.name ? ` bei ${partner.name}` : ''}. Wir prüfen euren Wunschtermin und stimmen das Menü mit euch ab.`,
                                                  en: `Your evening${partner.name ? ` at ${partner.name}` : ''}. We check your preferred date and align the menu with you.`,
                                              }[locale]
                                            : {
                                                  de: 'Wir prüfen euren Wunschtermin und stimmen das Menü mit euch ab.',
                                                  en: 'We check your preferred date and align the menu with you.',
                                              }[locale]}
                                    </p>
                                </div>

                                <div className="grid gap-4">
                                    <h2 className="text-lg font-medium">
                                        {{ de: 'Deine Kontaktdaten', en: 'Your contact details' }[locale]}
                                    </h2>
                                    <AuthIdentityGate
                                        initialSession={session}
                                        onSessionChange={setSession}
                                        onBusyChange={setAuthBusy}
                                        profileInitialValues={search.firstName ? { firstName: search.firstName } : undefined}
                                        onReady={() => {
                                            void submitBooking();
                                        }}
                                        footer={() => <AuthPasskeyLogOn />}
                                    />
                                    {signedIn ? (
                                        <div className="grid gap-3">
                                            <label className="grid gap-1.5 text-sm">
                                                <span className="font-medium">
                                                    {{ de: 'Wünsche & Allergien', en: 'Wishes & allergies' }[locale]}
                                                    <span className="ml-1 font-normal text-muted-foreground">
                                                        {{ de: 'Optional', en: 'Optional' }[locale]}
                                                    </span>
                                                </span>
                                                <Textarea
                                                    rows={4}
                                                    value={values.originalMessage}
                                                    onChange={(event) => form.setFieldValue('originalMessage', event.target.value)}
                                                    placeholder={
                                                        {
                                                            de: 'Ernährung, Allergien oder ein besonderer Anlass',
                                                            en: 'Diet, allergies, or a special occasion',
                                                        }[locale]
                                                    }
                                                    disabled={busy}
                                                />
                                            </label>
                                            <Button
                                                type="button"
                                                size="lg"
                                                className="w-full @md:w-fit"
                                                disabled={busy || authBusy}
                                                onClick={() => void submitBooking()}
                                            >
                                                {{ de: 'Buchungsanfrage senden', en: 'Send booking request' }[locale]}
                                                <ArrowRightIcon className="size-4" />
                                            </Button>
                                            <p className="text-xs text-muted-foreground">
                                                {
                                                    {
                                                        de: 'Unverbindlich. Es erfolgt noch keine Zahlung.',
                                                        en: 'Non-binding. No payment is made yet.',
                                                    }[locale]
                                                }
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden @lg:block">{summaryCard}</div>
                </div>
            </div>

            {step === 'details' ? (
                <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur @lg:hidden">
                    <div className="mx-auto flex max-w-7xl items-center gap-3">
                        <button
                            type="button"
                            className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-left"
                            onClick={() => setDetailsEditorOpen(true)}
                            aria-label={{ de: 'Angaben bearbeiten', en: 'Edit details' }[locale]}
                        >
                            <span className="flex items-center gap-2">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">
                                        {formatDate(values.dateTime, { locale, dateStyle: 'short' })} · {values.adultCount}
                                        {values.discountedCount > 0 ? `+${values.discountedCount}` : ''}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {{ de: 'Tippen zum Bearbeiten', en: 'Tap to edit' }[locale]}
                                    </span>
                                </span>
                                <PencilIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            </span>
                        </button>
                        <Button type="button" className="shrink-0" onClick={goToContact} disabled={!canContinueToContact()}>
                            {{ de: 'Weiter', en: 'Next' }[locale]}
                        </Button>
                    </div>
                </div>
            ) : null}

            <Footer />

            {detailsEditor}

            <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{{ de: 'Ein Abend voller neuer Aromen.', en: 'An evening full of new flavors.' }[locale]}</DialogTitle>
                        <DialogDescription>
                            {
                                {
                                    de: `Ein Beispielmenü für „${bookingRequestPlanCuisineLabel(values.cuisine, locale)}“. Euer Chef stimmt Gerichte, Kinderportionen und Ernährungswünsche persönlich mit euch ab.`,
                                    en: `A sample menu for “${bookingRequestPlanCuisineLabel(values.cuisine, locale)}”. Your chef personally coordinates dishes, children portions, and dietary needs with you.`,
                                }[locale]
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5">
                        {sampleMenuCourses(values.cuisine, locale).map((course) => (
                            <div key={course.course} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                                <p className="text-xs tracking-wide text-muted-foreground uppercase">{course.course}</p>
                                <p className="mt-1 font-medium">{course.title}</p>
                                <p className="text-sm text-muted-foreground">{course.description}</p>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={() => setMenuDialogOpen(false)}>
                            {{ de: 'Zurück zur Dinner-Planung', en: 'Back to dinner planning' }[locale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
