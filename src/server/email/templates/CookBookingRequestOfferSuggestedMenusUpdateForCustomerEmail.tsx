import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import {
    BookingRequestEmailBookingNumber,
    BookingRequestEmailCancellationPolicy,
    EmailButton,
    EmailLayout,
    EmailText,
} from '../components';

interface CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    cookFirstName: string;
    bookingRequestId: string;
    offerUrl: string;
}

export function CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    cookFirstName,
    bookingRequestId,
    offerUrl,
}: CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailProps) {
    const subject = cookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'offer.menusUpdate.preview', { cookFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'offer.menusUpdate.intro', { cookFirstName })}</EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'offer.menusUpdate.cta')}</EmailButton>
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
            <BookingRequestEmailCancellationPolicy locale={locale} webPageUrl={webPageUrl} />
        </EmailLayout>
    );
}

export function cookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'offer.menusUpdate.subject');
}
