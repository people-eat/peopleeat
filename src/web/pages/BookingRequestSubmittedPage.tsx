import { Link } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { bookingRequestKitchenDetailsDraftEmpty, bookingRequestKitchenDetailsDraftIsEmpty, featureToggleIsActive } from '../../shared';
import { AppImage } from '../components/AppImage';
import { Button } from '../components/base/button';
import { StatusAlert } from '../components/base/status-alert';
import type { BookingRequestKitchenDetailsPhoto } from '../components/BookingRequestKitchenDetailsFields';
import {
    bookingRequestKitchenDetailsDraftFromGql,
    bookingRequestKitchenDetailsInputFromDraft,
    bookingRequestKitchenDetailsPhotosFromGql,
    BookingRequestKitchenDetailsSaveCard,
} from '../components/BookingRequestKitchenDetailsFields';
import type { GqlCBookingRequestSubmittedPageQuery } from '../graphql/generated';
import { BookingRequestSubmittedKitchenDetailsUpdateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_LOGO_SRC_SET, SITE_NAME } from '../seo/seoConstants';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';

export const bookingRequestSubmittedPageTitle = {
    de: 'Anfrage gesendet',
    en: 'Request submitted',
} as const;

export const bookingRequestSubmittedPageDescription = {
    de: 'Deine Buchungsanfrage wurde gesendet. So geht es weiter.',
    en: 'Your booking request was submitted. Here is what happens next.',
} as const;

const SUBMITTED_STEP_IMAGES = [
    {
        src: '/booking-request/submitted/1.webp',
        alt: {
            de: 'Lachs-Crudo mit Kumquat und Kräuteröl, angerichtet für ein Event',
            en: 'Salmon crudo with kumquat and herb oil, plated for an event',
        },
    },
    {
        src: '/booking-request/submitted/2.webp',
        alt: {
            de: 'Gefüllte Hähnchenbrust mit Kartoffelpüree und Ofengemüse',
            en: 'Stuffed chicken breast with potato puree and roasted vegetables',
        },
    },
    {
        src: '/booking-request/submitted/3.webp',
        alt: {
            de: 'Blumenförmiges Dessert mit Minze, grüner Sauce und gelbem Coulis',
            en: 'Flower-shaped dessert with mint, green sauce, and yellow coulis',
        },
    },
] as const;

function nextSteps(locale: Locale): { title: string; body: string }[] {
    return [
        {
            title: {
                de: 'Du erhältst einen individuellen Menüvorschlag',
                en: 'You receive an individual menu proposal',
            }[locale],
            body: {
                de: 'Passende Köche in deiner Nähe erstellen individuelle Menüvorschläge für dein Event.',
                en: 'Suitable chefs in your area will create individual menu proposals for your event.',
            }[locale],
        },
        {
            title: {
                de: 'Finalisiere die letzten Einzelheiten',
                en: 'Finalize the last details',
            }[locale],
            body: {
                de: 'Wir benachrichtigen dich per E-Mail und, wenn wir deine Nummer haben, per WhatsApp, sobald neue Vorschläge bereit sind. Menüs und Kochprofile vergleichst du direkt in deiner Anfrage.',
                en: 'We will notify you by email and, when we have your number, by WhatsApp once new proposals are ready. You can compare menus and chef profiles directly in your request.',
            }[locale],
        },
        {
            title: {
                de: 'Bestätige dein Menüerlebnis',
                en: 'Confirm your menu experience',
            }[locale],
            body: {
                de: 'Wenn du das passende Angebot gefunden hast, nimmst du es an und der Koch hält den Termin für dich frei.',
                en: "Once you've found the right offer, you accept it and the chef reserves their calendar for your event.",
            }[locale],
        },
    ];
}

export function bookingRequestSubmittedPageVariables(bookingRequestId: string) {
    return { bookingRequestId };
}

export function BookingRequestSubmittedPage({
    data,
    bookingRequestId,
}: {
    data: GqlCBookingRequestSubmittedPageQuery;
    bookingRequestId: string;
}) {
    const locale = useLocale();
    const bookingRequest = data.currentSession.user?.bookingRequest;
    const steps = nextSteps(locale);
    const kitchenEnabled = featureToggleIsActive(data.currentSession.activeFeatureToggleKeys, 'BOOKING_REQUEST_KITCHEN_DETAILS');
    const [, updateKitchenDetails] = useMutation(BookingRequestSubmittedKitchenDetailsUpdateDocument);
    const [kitchenDraft, setKitchenDraft] = useState(() => {
        const existing = data.currentSession.user?.bookingRequest?.kitchenDetails;
        return existing == null ? bookingRequestKitchenDetailsDraftEmpty : bookingRequestKitchenDetailsDraftFromGql(existing);
    });
    const [kitchenPhotos, setKitchenPhotos] = useState<BookingRequestKitchenDetailsPhoto[]>(() =>
        bookingRequestKitchenDetailsPhotosFromGql(data.currentSession.user?.bookingRequest?.kitchenDetails?.photos),
    );
    const [kitchenBusy, setKitchenBusy] = useState(false);
    const [kitchenError, setKitchenError] = useState<string | null>(null);
    const [kitchenSaved, setKitchenSaved] = useState(false);

    if (!bookingRequest) {
        return null;
    }

    const kitchenEmpty = bookingRequestKitchenDetailsDraftIsEmpty(
        bookingRequestKitchenDetailsDraftFromGql(bookingRequest.kitchenDetails),
        bookingRequest.kitchenDetails?.photos.length ?? 0,
    );
    const showKitchenCard = kitchenEnabled && kitchenEmpty && !kitchenSaved;

    return (
        <main id="main-content" className="flex h-dvh flex-col">
            <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between p-4">
                <Link
                    to="/{-$locale}"
                    className="inline-flex shrink-0 rounded-lg bg-background/30 px-2 backdrop-blur-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                    <AppImage
                        priority
                        src={SITE_LOGO}
                        srcSet={SITE_LOGO_SRC_SET}
                        alt={SITE_NAME}
                        width={SITE_LOGO_DISPLAY.width}
                        height={SITE_LOGO_DISPLAY.height}
                        className="h-7 w-auto"
                    />
                </Link>
                <Button type="button" variant="ghost" size="icon" asChild aria-label={{ de: 'Schließen', en: 'Close' }[locale]}>
                    <Link to="/{-$locale}">
                        <XIcon />
                    </Link>
                </Button>
            </header>

            <div data-scroll-restoration-id="booking-form" className="min-h-0 flex-1 overflow-y-auto pt-14 scrollbar-gutter-stable">
                <div className="mx-auto grid w-full max-w-3xl gap-10 p-4 lg:mt-12 lg:gap-14">
                    {showKitchenCard ? (
                        <BookingRequestKitchenDetailsSaveCard
                            locale={locale}
                            value={kitchenDraft}
                            photos={kitchenPhotos}
                            busy={kitchenBusy}
                            error={kitchenError}
                            onChange={setKitchenDraft}
                            onPhotosChange={setKitchenPhotos}
                            onSave={async () => {
                                if (bookingRequestKitchenDetailsDraftIsEmpty(kitchenDraft, kitchenPhotos.length)) return;
                                setKitchenBusy(true);
                                setKitchenError(null);
                                try {
                                    const result = await updateKitchenDetails({
                                        bookingRequestId,
                                        kitchenDetails: bookingRequestKitchenDetailsInputFromDraft(kitchenDraft),
                                        photoFileUploadIds: kitchenPhotos.map((photo) => photo.fileUploadId),
                                    });
                                    if (result.error || !result.data?.user.bookingRequestKitchenDetailsUpdate.success) {
                                        throw new Error('kitchen details update failed');
                                    }
                                    setKitchenSaved(true);
                                    toast.success(
                                        {
                                            de: 'Küchendetails gespeichert.',
                                            en: 'Kitchen details saved.',
                                        }[locale],
                                    );
                                } catch {
                                    setKitchenError(
                                        {
                                            de: 'Küchendetails konnten nicht gespeichert werden.',
                                            en: 'Could not save kitchen details.',
                                        }[locale],
                                    );
                                } finally {
                                    setKitchenBusy(false);
                                }
                            }}
                        />
                    ) : null}
                    <section className="grid gap-8 lg:gap-10">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                            {{ de: 'Wie geht es weiter?', en: 'What happens next?' }[locale]}
                        </h1>

                        <div className="grid gap-0">
                            {steps.map((step, index) => {
                                const image = SUBMITTED_STEP_IMAGES[index];
                                if (!image) {
                                    return null;
                                }
                                const isLast = index === steps.length - 1;
                                return (
                                    <div
                                        key={step.title}
                                        className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_9rem] lg:items-start lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_10rem]"
                                    >
                                        <div className="flex gap-4">
                                            <div className="flex w-9 shrink-0 flex-col items-center">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-foreground">
                                                    {index + 1}
                                                </span>
                                                {!isLast ? <span className="my-1 w-0.5 flex-1 bg-amber-100" aria-hidden /> : null}
                                            </div>
                                            <div className={cn('min-w-0 flex-1 pb-8 lg:pb-0', isLast && 'pb-0')}>
                                                <div className="flex h-9 items-center">
                                                    <h2 className="font-medium leading-none text-foreground">{step.title}</h2>
                                                </div>
                                                <p className="text-sm/relaxed text-muted-foreground">{step.body}</p>
                                            </div>
                                        </div>

                                        <AppImage
                                            src={image.src}
                                            alt={image.alt[locale]}
                                            width={960}
                                            height={960}
                                            className={cn(
                                                'hidden aspect-square w-full rounded-2xl object-cover lg:block',
                                                !isLast && 'lg:mb-6',
                                            )}
                                        />
                                    </div>
                                );
                            })}

                            <div className="grid grid-cols-3 gap-3 pt-2 lg:hidden">
                                {SUBMITTED_STEP_IMAGES.map((image) => (
                                    <AppImage
                                        key={image.src}
                                        src={image.src}
                                        alt={image.alt[locale]}
                                        width={960}
                                        height={960}
                                        className="aspect-square w-full rounded-xl object-cover"
                                    />
                                ))}
                            </div>
                        </div>
                    </section>

                    <StatusAlert
                        tone="success"
                        title={bookingRequestSubmittedPageTitle[locale]}
                        action={
                            <Button type="button" variant="outline" asChild>
                                <Link to="/{-$locale}/profile/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                                    {{ de: 'Zur Anfrage', en: 'View request' }[locale]}
                                </Link>
                            </Button>
                        }
                    >
                        {
                            {
                                de: 'Geeignete Köche in deiner Region haben deine Anfrage erhalten. Wir informieren dich, sobald Menüvorschläge vorliegen.',
                                en: 'Suitable chefs in your area received your request. You will be notified once you get an offer.',
                            }[locale]
                        }
                    </StatusAlert>
                </div>
            </div>
        </main>
    );
}
