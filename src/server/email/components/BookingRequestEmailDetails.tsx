import { tEmail } from '../../../i18n/tEmail';
import { formatBookingEventDate } from '../../../shared/formatBookingWhen';
import type { Locale } from '../../../shared/locale';
import { timeZoneFromCountry } from '../../../shared/timeZone';
import { EmailSectionHeading } from './EmailSectionHeading';
import { EmailText } from './EmailText';

export type BookingRequestEmailDetailsProps = {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    occasion: string;
    dateTime: Date;
    address: string;
    priceClassLabel?: string;
    adultCount?: number;
    discountedCount?: number;
    suggestedMenuTitles?: string[];
    travelAndFeesNote?: boolean;
};

function detailLine(label: string, value: string) {
    return (
        <EmailText style={{ marginBottom: '4px' }}>
            <strong>{label}:</strong> {value}
        </EmailText>
    );
}

export function BookingRequestEmailDetails({
    locale,
    timeZone,
    venueCountry,
    occasion,
    dateTime,
    address,
    priceClassLabel,
    adultCount,
    discountedCount,
    suggestedMenuTitles,
    travelAndFeesNote = false,
}: BookingRequestEmailDetailsProps) {
    const when = formatBookingEventDate({
        instant: dateTime,
        locale,
        venueTimeZone: venueCountry != null ? timeZoneFromCountry(venueCountry) : timeZone,
        dateStyle: 'long',
        weekday: true,
    });

    return (
        <>
            <EmailSectionHeading>{tEmail(locale, 'booking.details.heading')}</EmailSectionHeading>
            {priceClassLabel ? detailLine(tEmail(locale, 'booking.details.priceClass'), priceClassLabel) : null}
            {travelAndFeesNote ? <EmailText>{tEmail(locale, 'booking.details.feesNote')}</EmailText> : null}
            {suggestedMenuTitles && suggestedMenuTitles.length > 0
                ? detailLine(tEmail(locale, 'booking.details.menus'), suggestedMenuTitles.join(', '))
                : null}
            {detailLine(tEmail(locale, 'booking.details.occasion'), occasion)}
            {detailLine(tEmail(locale, 'booking.details.date'), when)}
            {detailLine(tEmail(locale, 'booking.details.address'), address)}
            {adultCount != null ? detailLine(tEmail(locale, 'booking.details.adults'), String(adultCount)) : null}
            {discountedCount != null ? detailLine(tEmail(locale, 'booking.details.children'), String(discountedCount)) : null}
        </>
    );
}
