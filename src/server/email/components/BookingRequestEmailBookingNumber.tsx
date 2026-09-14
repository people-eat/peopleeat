import type { Locale } from '../../../shared/locale';
import { EmailSectionHeading } from './EmailSectionHeading';
import { EmailText } from './EmailText';

export function BookingRequestEmailBookingNumber({ locale, bookingRequestId }: { locale: Locale; bookingRequestId: string }) {
    const heading = { de: 'Buchungsnummer', en: 'Booking number' }[locale];

    return (
        <>
            <EmailSectionHeading>{heading}</EmailSectionHeading>
            <EmailText>{bookingRequestId}</EmailText>
        </>
    );
}
