import { t } from '../../i18n/t';
import {
    bookingRequestKitchenDetailsAvailabilityLabel,
    bookingRequestKitchenDetailsGuestTablewareLabel,
    bookingRequestKitchenDetailsSpaceLabel,
} from '../../shared';
import type { Locale } from '../utils/locale';
import { AppImage } from './AppImage';

export type BookingRequestVenueKitchenDetailsFact = {
    availability?: 'FULL' | 'LIMITED' | 'NONE' | 'UNKNOWN' | null;
    fridgeSpace?: 'YES' | 'LIMITED' | 'NO' | null;
    platingSpace?: 'YES' | 'LIMITED' | 'NO' | null;
    guestTableware?: 'PROVIDED' | 'COOK_BRINGS' | 'MIXED' | null;
    notes?: string | null;
    photos?: readonly { fileUploadId: string; url: string }[] | null;
};

function bookingRequestKitchenDetailsFactLines(
    details: BookingRequestVenueKitchenDetailsFact | null | undefined,
    locale: Locale,
): { label: string; value: string }[] {
    if (details == null) return [];
    const lines: { label: string; value: string }[] = [];
    if (details.availability) {
        lines.push({
            label: t(locale, 'common', 'bookingRequestKitchenUi.fact.kitchen'),
            value: bookingRequestKitchenDetailsAvailabilityLabel(details.availability, locale),
        });
    }
    if (details.fridgeSpace) {
        lines.push({
            label: t(locale, 'common', 'bookingRequestKitchenUi.fact.fridge'),
            value: bookingRequestKitchenDetailsSpaceLabel(details.fridgeSpace, locale),
        });
    }
    if (details.platingSpace) {
        lines.push({
            label: t(locale, 'common', 'bookingRequestKitchenUi.fact.plating'),
            value: bookingRequestKitchenDetailsSpaceLabel(details.platingSpace, locale),
        });
    }
    if (details.guestTableware) {
        lines.push({
            label: t(locale, 'common', 'bookingRequestKitchenUi.fact.tableware'),
            value: bookingRequestKitchenDetailsGuestTablewareLabel(details.guestTableware, locale),
        });
    }
    if (details.notes?.trim()) {
        lines.push({
            label: t(locale, 'common', 'bookingRequestKitchenUi.fact.notes'),
            value: details.notes.trim(),
        });
    }
    return lines;
}

function BookingRequestKitchenDetailsPhotoRow({ photos }: { photos: readonly { fileUploadId: string; url: string }[] }) {
    if (photos.length === 0) return null;
    return (
        <div className="grid grid-cols-3 gap-2 pt-1">
            {photos.map((photo) => (
                <AppImage key={photo.fileUploadId} src={photo.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
            ))}
        </div>
    );
}

export function bookingRequestKitchenDetailsHasFacts(
    details: BookingRequestVenueKitchenDetailsFact | null | undefined,
    locale: Locale,
): boolean {
    return bookingRequestKitchenDetailsFactLines(details, locale).length > 0 || (details?.photos?.length ?? 0) > 0;
}

export function BookingRequestKitchenDetailsFactContent({
    details,
    locale,
}: {
    details: BookingRequestVenueKitchenDetailsFact | null | undefined;
    locale: Locale;
}) {
    const lines = bookingRequestKitchenDetailsFactLines(details, locale);
    const photos = details?.photos ?? [];
    if (lines.length === 0 && photos.length === 0) return null;
    return (
        <div className="grid gap-2">
            {lines.length > 0 ? (
                <ul className="grid gap-1">
                    {lines.map((line) => (
                        <li key={line.label}>
                            {line.label}: {line.value}
                        </li>
                    ))}
                </ul>
            ) : null}
            {photos.length > 0 ? <BookingRequestKitchenDetailsPhotoRow photos={photos} /> : null}
        </div>
    );
}
