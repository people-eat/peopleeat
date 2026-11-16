import { Link } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../i18n/t';
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
import { BookingRequestOpenToOtherCooksButton } from '../components/BookingRequestOpenToOtherCooksButton';
import type { GqlCBookingRequestSubmittedPageQuery } from '../graphql/generated';
import { BookingRequestSubmittedKitchenDetailsUpdateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_LOGO_SRC_SET, SITE_NAME } from '../seo/seoConstants';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';

export function bookingRequestSubmittedPageTitle(locale: Locale): string {
    return t(locale, 'publicBooking', 'submitted.seo.title');
}

export function bookingRequestSubmittedPageDescription(locale: Locale): string {
    return t(locale, 'publicBooking', 'submitted.seo.description');
}

const SUBMITTED_STEP_IMAGE_KEYS = ['1', '2', '3'] as const;

function nextSteps(locale: Locale, cookName: string | null): { title: string; body: string }[] {
    return [
        {
            title: t(locale, 'publicBooking', 'submitted.steps.menu.title'),
            body: cookName
                ? t(locale, 'publicBooking', 'submitted.steps.menu.bodyCook', { cookName })
                : t(locale, 'publicBooking', 'submitted.steps.menu.body'),
        },
        {
            title: t(locale, 'publicBooking', 'submitted.steps.details.title'),
            body: t(locale, 'publicBooking', 'submitted.steps.details.body'),
        },
        {
            title: t(locale, 'publicBooking', 'submitted.steps.confirm.title'),
            body: t(locale, 'publicBooking', 'submitted.steps.confirm.body'),
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
    const { t: tBooking } = useT('publicBooking');
    const { t: tCommon } = useT('common');
    const bookingRequest = data.currentSession.user?.bookingRequest;
    const requestedCookName = bookingRequest?.requestedCook?.user.display ?? null;
    const requestedMenuTitle = bookingRequest?.requestedMenu?.title?.trim() || null;
    const steps = nextSteps(locale, bookingRequest?.isExclusive ? requestedCookName : null);
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
                <Button type="button" variant="ghost" size="icon" asChild aria-label={tCommon('close')}>
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
                                    toast.success(tBooking('submitted.kitchen.saved'));
                                } catch {
                                    setKitchenError(tBooking('submitted.kitchen.saveFailed'));
                                } finally {
                                    setKitchenBusy(false);
                                }
                            }}
                        />
                    ) : null}
                    <section className="grid gap-8 lg:gap-10">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                            {tBooking('submitted.heading')}
                        </h1>

                        <div className="grid gap-0">
                            {steps.map((step, index) => {
                                const imageKey = SUBMITTED_STEP_IMAGE_KEYS[index];
                                if (!imageKey) {
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
                                            src={`/booking-request/submitted/${imageKey}.webp`}
                                            alt={tBooking(`submitted.images.${imageKey}`)}
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
                                {SUBMITTED_STEP_IMAGE_KEYS.map((imageKey) => (
                                    <AppImage
                                        key={imageKey}
                                        src={`/booking-request/submitted/${imageKey}.webp`}
                                        alt={tBooking(`submitted.images.${imageKey}`)}
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
                        title={tBooking('submitted.seo.title')}
                        action={
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {bookingRequest.isExclusive && requestedCookName ? (
                                    <BookingRequestOpenToOtherCooksButton
                                        bookingRequestId={bookingRequestId}
                                        cookFirstName={requestedCookName}
                                        prominence={bookingRequest.directRequestNeedsExpansion ? 'primary' : 'secondary'}
                                    />
                                ) : null}
                                <Button type="button" variant="outline" asChild>
                                    <Link to="/{-$locale}/profile/booking-requests/$bookingRequestId" params={{ bookingRequestId }}>
                                        {tBooking('submitted.viewRequest')}
                                    </Link>
                                </Button>
                            </div>
                        }
                    >
                        {bookingRequest.isExclusive && requestedCookName
                            ? requestedMenuTitle
                                ? tBooking('submitted.status.exclusiveWithMenu', {
                                      cookName: requestedCookName,
                                      menuTitle: requestedMenuTitle,
                                  })
                                : tBooking('submitted.status.exclusive', { cookName: requestedCookName })
                            : tBooking('submitted.status.pool')}
                    </StatusAlert>
                </div>
            </div>
        </main>
    );
}
