import type { Locale } from '../../../shared/locale';
import {
    BookingRequestEmailBookingNumber,
    BookingRequestEmailCancellationPolicy,
    BookingRequestEmailDetails,
    EmailButton,
    EmailLayout,
    EmailText,
} from '../components';

interface UserBookingRequestCreateForCustomerEmailProps {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    webPageUrl: string;
    recipientFirstName?: string;
    bookingRequestId: string;
    occasion: string;
    dateTime: Date;
    address: string;
    priceClassLabel: string;
    adultCount: number;
    discountedCount: number;
    requestUrl: string;
    requestedCookFirstName?: string | null;
    requestedMenuTitle?: string | null;
}

export function UserBookingRequestCreateForCustomerEmail({
    locale,
    timeZone,
    venueCountry,
    webPageUrl,
    recipientFirstName,
    bookingRequestId,
    occasion,
    dateTime,
    address,
    priceClassLabel,
    adultCount,
    discountedCount,
    requestUrl,
    requestedCookFirstName,
    requestedMenuTitle,
}: UserBookingRequestCreateForCustomerEmailProps) {
    const cookName = requestedCookFirstName?.trim() || null;
    const menuTitle = requestedMenuTitle?.trim() || null;
    const subject = userBookingRequestCreateForCustomerEmailSubject(locale);
    const preview = cookName
        ? {
              de: `${cookName} schaut sich deine Anfrage an`,
              en: `${cookName} will look at your request`,
          }[locale]
        : {
              de: 'Deine Anfrage ist da. Köche in deiner Nähe bereiten Menüs vor',
              en: 'Your request is in. Chefs nearby are preparing menus',
          }[locale];
    const intro = {
        de: 'Vielen Dank für deine Anfrage! Hiermit bestätigen wir den Eingang deiner Anfrage.',
        en: 'Thank you for your request! This confirms that we have received it.',
    }[locale];
    const nextHeading = { de: 'Wie geht es weiter?', en: 'What happens next?' }[locale];
    const steps = cookName
        ? {
              de: [
                  menuTitle
                      ? `${cookName} schaut sich deine Anfrage für „${menuTitle}“ an und schickt dir ein Angebot.`
                      : `${cookName} schaut sich deine Anfrage an und schickt dir ein Angebot.`,
                  'Du entscheidest danach in Ruhe.',
                  'Du kannst die Anfrage jederzeit auch für andere Köche in deiner Nähe öffnen.',
                  'Nach der Buchung kannst du mit dem Koch chatten.',
              ],
              en: [
                  menuTitle
                      ? `${cookName} will look at your request for “${menuTitle}” and send you an offer.`
                      : `${cookName} will look at your request and send you an offer.`,
                  'Then you decide, no rush.',
                  'You can open it to other chefs nearby at any time.',
                  'After booking, you can chat with the chef.',
              ],
          }[locale]
        : {
              de: [
                  'Unsere Köche in deiner Nähe erstellen Menüvorschläge.',
                  'Du wirst benachrichtigt, sobald neue Vorschläge da sind.',
                  'Anpassungen kannst du jederzeit anfragen.',
                  'Nach der Buchung kannst du mit dem Koch chatten.',
              ],
              en: [
                  'Chefs near you will prepare menu proposals.',
                  'You will be notified as soon as new proposals arrive.',
                  'You can request adjustments at any time.',
                  'After booking, you can chat with the chef.',
              ],
          }[locale];
    const statusNote = {
        de: 'Du kannst jederzeit den Status deiner Anfrage ansehen.',
        en: 'You can check the status of your request at any time.',
    }[locale];
    const cta = { de: 'Anfrage ansehen', en: 'View request' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText style={{ marginBottom: '8px' }}>
                <strong>{nextHeading}</strong>
            </EmailText>
            {steps.map((step) => (
                <EmailText key={step} style={{ marginBottom: '4px' }}>
                    {step}
                </EmailText>
            ))}
            <EmailText>{statusNote}</EmailText>
            <EmailButton href={requestUrl}>{cta}</EmailButton>
            <BookingRequestEmailDetails
                locale={locale}
                timeZone={timeZone}
                venueCountry={venueCountry}
                occasion={occasion}
                dateTime={dateTime}
                address={address}
                priceClassLabel={priceClassLabel}
                adultCount={adultCount}
                discountedCount={discountedCount}
                travelAndFeesNote
            />
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
            <BookingRequestEmailCancellationPolicy locale={locale} webPageUrl={webPageUrl} />
        </EmailLayout>
    );
}

export function userBookingRequestCreateForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Buchungsanfrage', en: 'Booking request' }[locale];
}
