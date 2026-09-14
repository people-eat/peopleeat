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
    const preview = {
        de: `Chef ${cookFirstName} hat dir einen Menüvorschlag geschickt. Jetzt ansehen`,
        en: `Chef ${cookFirstName} sent you a menu proposal. Take a look`,
    }[locale];
    const intro = {
        de: `Gute Neuigkeiten: Chef ${cookFirstName} hat dir ein Angebot mit einem Menüvorschlag geschickt.`,
        en: `Good news: Chef ${cookFirstName} sent you an offer with a menu proposal.`,
    }[locale];
    const cta = { de: 'Menüvorschlag ansehen', en: 'View menu proposal' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailButton href={offerUrl}>{cta}</EmailButton>
            <BookingRequestEmailDetails
                locale={locale}
                timeZone={timeZone}
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
    return { de: 'Angebot erhalten', en: 'You received an offer' }[locale];
}
