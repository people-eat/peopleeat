import { Link } from 'react-email';

import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { bookingRequestEmailTermsUrl } from './bookingRequestEmailUrls';
import { EmailSectionHeading } from './EmailSectionHeading';
import { emailStyles } from './emailStyles';
import { EmailText } from './EmailText';

export function BookingRequestEmailCancellationPolicy({ locale, webPageUrl }: { locale: Locale; webPageUrl: string }) {
    const termsUrl = bookingRequestEmailTermsUrl(webPageUrl, locale);

    return (
        <>
            <EmailSectionHeading>{tEmail(locale, 'booking.cancellation.heading')}</EmailSectionHeading>
            <EmailText>
                {tEmail(locale, 'booking.cancellation.before')}
                <Link href={termsUrl} style={emailStyles.link}>
                    {tEmail(locale, 'booking.cancellation.terms')}
                </Link>
                {tEmail(locale, 'booking.cancellation.after')}
            </EmailText>
        </>
    );
}
