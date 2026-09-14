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
    const preview = {
        de: `Chef ${cookFirstName} hat dein Menü nach deinen Wünschen angepasst`,
        en: `Chef ${cookFirstName} updated your menu based on your wishes`,
    }[locale];
    const intro = {
        de: `Gute Neuigkeiten: Chef ${cookFirstName} hat das Menü in deinem Angebot nach deinen Wünschen angepasst.`,
        en: `Good news: Chef ${cookFirstName} updated the menu in your offer based on your feedback.`,
    }[locale];
    const cta = { de: 'Menü anschauen', en: 'View menu' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailButton href={offerUrl}>{cta}</EmailButton>
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
            <BookingRequestEmailCancellationPolicy locale={locale} webPageUrl={webPageUrl} />
        </EmailLayout>
    );
}

export function cookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Menü aus Angebot wurde angepasst', en: 'Offer menu was updated' }[locale];
}
