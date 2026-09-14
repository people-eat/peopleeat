import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface UserBookingRequestUpdateForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
    offerUrl: string;
}

export function UserBookingRequestUpdateForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
    offerUrl,
}: UserBookingRequestUpdateForCookEmailProps) {
    const subject = userBookingRequestUpdateForCookEmailSubject(locale);
    const preview = {
        de: `Bitte prüfen: ${customerFirstName} hat die Buchungsanfrage geändert`,
        en: `Please review: ${customerFirstName} updated the booking request`,
    }[locale];
    const body = {
        de: `${customerFirstName} hat Änderungen an der Buchungsanfrage vorgenommen. Bitte prüfe die Änderungen und bestätige dein Angebot erneut, falls du weiterhin anbieten möchtest.`,
        en: `${customerFirstName} updated the booking request. Please review the changes and re-confirm your offer if you still want to cook for this event.`,
    }[locale];
    const cta = { de: 'Änderungen überprüfen', en: 'Review changes' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailButton href={offerUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function userBookingRequestUpdateForCookEmailSubject(locale: Locale): string {
    return { de: 'Änderungen an Buchungsanfrage', en: 'Booking request updated' }[locale];
}
