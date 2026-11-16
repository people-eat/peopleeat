import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailSectionHeading } from './EmailSectionHeading';
import { EmailText } from './EmailText';

export function BookingRequestEmailBookingNumber({ locale, bookingRequestId }: { locale: Locale; bookingRequestId: string }) {
    return (
        <>
            <EmailSectionHeading>{tEmail(locale, 'booking.number')}</EmailSectionHeading>
            <EmailText>{bookingRequestId}</EmailText>
        </>
    );
}
