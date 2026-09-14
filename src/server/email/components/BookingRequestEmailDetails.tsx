import { formatDate } from '../../../shared/formatDate';
import type { Locale } from '../../../shared/locale';
import { EmailSectionHeading } from './EmailSectionHeading';
import { EmailText } from './EmailText';

export type BookingRequestEmailDetailsProps = {
    locale: Locale;
    timeZone: string;
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
    occasion,
    dateTime,
    address,
    priceClassLabel,
    adultCount,
    discountedCount,
    suggestedMenuTitles,
    travelAndFeesNote = false,
}: BookingRequestEmailDetailsProps) {
    const heading = { de: 'Buchungsdetails', en: 'Booking details' }[locale];
    const when = formatDate(dateTime, { locale, dateStyle: 'long', weekday: true, timeZone });
    const labels = {
        priceClass: { de: 'Menükategorie', en: 'Menu category' }[locale],
        occasion: { de: 'Anlass', en: 'Occasion' }[locale],
        date: { de: 'Datum', en: 'Date' }[locale],
        address: { de: 'Ort', en: 'Location' }[locale],
        adults: { de: 'Erwachsene Teilnehmer', en: 'Adult guests' }[locale],
        children: { de: 'Kinder', en: 'Children' }[locale],
        menus: { de: 'Vorgeschlagenes Menü', en: 'Suggested menu' }[locale],
    };
    const feesNote = {
        de: 'Bitte beachte, dass Fahrtkosten und Servicegebühren zusätzlich anfallen können.',
        en: 'Please note that travel costs and service fees may apply in addition.',
    }[locale];

    return (
        <>
            <EmailSectionHeading>{heading}</EmailSectionHeading>
            {priceClassLabel ? detailLine(labels.priceClass, priceClassLabel) : null}
            {travelAndFeesNote ? <EmailText>{feesNote}</EmailText> : null}
            {suggestedMenuTitles && suggestedMenuTitles.length > 0 ? detailLine(labels.menus, suggestedMenuTitles.join(', ')) : null}
            {detailLine(labels.occasion, occasion)}
            {detailLine(labels.date, when)}
            {detailLine(labels.address, address)}
            {adultCount != null ? detailLine(labels.adults, String(adultCount)) : null}
            {discountedCount != null ? detailLine(labels.children, String(discountedCount)) : null}
        </>
    );
}
