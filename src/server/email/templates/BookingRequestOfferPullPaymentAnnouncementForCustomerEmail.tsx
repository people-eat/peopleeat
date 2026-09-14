import { formatCurrency, formatDate } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailSectionHeading, EmailText } from '../components';

interface BookingRequestOfferPullPaymentAnnouncementForCustomerEmailProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    bookingRequestId: string;
    totalCentsCustomer: number;
    pullPaymentDate: Date;
    requestUrl: string;
}

export function BookingRequestOfferPullPaymentAnnouncementForCustomerEmail({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    bookingRequestId,
    totalCentsCustomer,
    pullPaymentDate,
    requestUrl,
}: BookingRequestOfferPullPaymentAnnouncementForCustomerEmailProps) {
    const subject = bookingRequestOfferPullPaymentAnnouncementForCustomerEmailSubject(locale);
    const when = formatDate(pullPaymentDate, { locale, dateStyle: 'long', timeZone });
    const amount = formatCurrency(totalCentsCustomer, { locale });
    const preview = {
        de: `Dein Event rückt näher: Zahlung von ${amount} am ${when}`,
        en: `Your event is coming up: ${amount} will be charged on ${when}`,
    }[locale];
    const intro = {
        de: `Für deinen Anlass haben wir eine Zahlung bei uns vorgemerkt. Da dein Event schon bald stattfindet, werden wir die Kosten am ${when} einziehen.`,
        en: `We've reserved a payment for your event. Because your event is coming up soon, we'll charge the amount on ${when}.`,
    }[locale];
    const why = {
        de: 'Das ist notwendig, damit der Koch alle Lebensmittel und sonstigen Utensilien für dein Event vorab kaufen kann.',
        en: 'This lets the chef buy groceries and other supplies for your event ahead of time.',
    }[locale];
    const cta = { de: 'Anfrage ansehen', en: 'View request' }[locale];
    const detailsHeading = { de: 'Abbuchungsdetails', en: 'Charge details' }[locale];
    const labels = {
        bookingNumber: { de: 'Buchungsnummer', en: 'Booking number' }[locale],
        price: { de: 'Preis', en: 'Price' }[locale],
        pullDate: { de: 'Zahlungseinzugsdatum', en: 'Charge date' }[locale],
    };
    const cardNote = {
        de: 'Bitte vergewissere dich, dass deine Karte über ausreichend Guthaben verfügt und nicht vor dem Abbuchungsdatum abläuft. Wenn du die Karte aktualisieren möchtest, die wir belasten werden, setze dich bitte mit uns in Verbindung.',
        en: "Please make sure your card has sufficient funds and does not expire before the charge date. If you'd like to update the card we'll charge, please get in touch with us.",
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText>{why}</EmailText>
            <EmailButton href={requestUrl}>{cta}</EmailButton>
            <EmailSectionHeading>{detailsHeading}</EmailSectionHeading>
            <EmailText style={{ marginBottom: '4px' }}>
                <strong>{labels.bookingNumber}:</strong> {bookingRequestId}
            </EmailText>
            <EmailText style={{ marginBottom: '4px' }}>
                <strong>{labels.price}:</strong> {amount}
            </EmailText>
            <EmailText style={{ marginBottom: '4px' }}>
                <strong>{labels.pullDate}:</strong> {when}
            </EmailText>
            <EmailText>{cardNote}</EmailText>
        </EmailLayout>
    );
}

export function bookingRequestOfferPullPaymentAnnouncementForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Wir belasten bald deine Karte', en: "We'll charge your card soon" }[locale];
}
