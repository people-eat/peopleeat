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
}

export function UserBookingRequestCreateForCustomerEmail({
    locale,
    timeZone,
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
}: UserBookingRequestCreateForCustomerEmailProps) {
    const subject = userBookingRequestCreateForCustomerEmailSubject(locale);
    const preview = {
        de: 'Deine Anfrage ist da. Köche in deiner Nähe bereiten Menüs vor',
        en: 'Your request is in. Chefs nearby are preparing menus',
    }[locale];
    const intro = {
        de: 'Vielen Dank für deine Anfrage! Hiermit bestätigen wir den Eingang deiner Anfrage.',
        en: 'Thank you for your request! This confirms that we have received it.',
    }[locale];
    const nextHeading = { de: 'Wie geht es weiter?', en: 'What happens next?' }[locale];
    const steps = {
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
