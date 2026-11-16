import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import {
    BookingRequestEmailBookingNumber,
    BookingRequestEmailCancellationPolicy,
    BookingRequestEmailDetails,
    EmailButton,
    EmailLayout,
    EmailText,
} from '../components';

interface CookBookingRequestOfferCreateForCustomerEmailProps {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    webPageUrl: string;
    recipientFirstName?: string;
    cookFirstName: string;
    bookingRequestId: string;
    occasion: string;
    dateTime: Date;
    address: string;
    suggestedMenuTitles: string[];
    offerUrl: string;
}

export function CookBookingRequestOfferCreateForCustomerEmail({
    locale,
    timeZone,
    venueCountry,
    webPageUrl,
    recipientFirstName,
    cookFirstName,
    bookingRequestId,
    occasion,
    dateTime,
    address,
    suggestedMenuTitles,
    offerUrl,
}: CookBookingRequestOfferCreateForCustomerEmailProps) {
    const subject = cookBookingRequestOfferCreateForCustomerEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'offer.create.preview', { cookFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'offer.create.intro', { cookFirstName })}</EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'offer.create.cta')}</EmailButton>
            <BookingRequestEmailDetails
                locale={locale}
                timeZone={timeZone}
                venueCountry={venueCountry}
                occasion={occasion}
                dateTime={dateTime}
                address={address}
                suggestedMenuTitles={suggestedMenuTitles}
            />
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
            <BookingRequestEmailCancellationPolicy locale={locale} webPageUrl={webPageUrl} />
        </EmailLayout>
    );
}

export function cookBookingRequestOfferCreateForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'offer.create.subject');
}
