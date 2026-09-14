import { Link } from 'react-email';

import type { Locale } from '../../../shared/locale';
import { bookingRequestEmailTermsUrl } from './bookingRequestEmailUrls';
import { EmailSectionHeading } from './EmailSectionHeading';
import { emailStyles } from './emailStyles';
import { EmailText } from './EmailText';

export function BookingRequestEmailCancellationPolicy({ locale, webPageUrl }: { locale: Locale; webPageUrl: string }) {
    const termsUrl = bookingRequestEmailTermsUrl(webPageUrl, locale);
    const termsLabel = { de: 'AGB', en: 'terms and conditions' }[locale];
    const heading = { de: 'Stornierungsbedingungen', en: 'Cancellation policy' }[locale];
    const body = {
        de: 'Kostenlose Stornierung ist bis zur Annahme der Anfrage und bis zu zwei Wochen vor dem Ereignis möglich. Bei späteren Stornierungen können Gebühren anfallen. Wenn du deine Reservierung ändern musst, kontaktiere uns bitte so früh wie möglich, damit wir dir bestmöglich helfen können. Weitere Informationen kannst du aus unseren ',
        en: 'Free cancellation is possible until the request is accepted and up to two weeks before the event. Later cancellations may incur fees. If you need to change your reservation, please contact us as early as possible so we can help. You can find more information in our ',
    }[locale];
    const after = { de: ' entnehmen.', en: '.' }[locale];

    return (
        <>
            <EmailSectionHeading>{heading}</EmailSectionHeading>
            <EmailText>
                {body}
                <Link href={termsUrl} style={emailStyles.link}>
                    {termsLabel}
                </Link>
                {after}
            </EmailText>
        </>
    );
}
