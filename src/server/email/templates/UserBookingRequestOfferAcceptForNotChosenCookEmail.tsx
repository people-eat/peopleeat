import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface UserBookingRequestOfferAcceptForNotChosenCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
}

export function UserBookingRequestOfferAcceptForNotChosenCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
}: UserBookingRequestOfferAcceptForNotChosenCookEmailProps) {
    const subject = userBookingRequestOfferAcceptForNotChosenCookEmailSubject(locale);
    const preview = {
        de: 'Diese Anfrage ist vergeben. Bald kommen neue in deiner Nähe',
        en: 'This request went to another chef. New ones near you are coming',
    }[locale];
    const intro = {
        de: `${customerFirstName} hat sich leider für einen anderen Privatkoch entschieden. Diese Anfrage ist daher nicht mehr verfügbar.`,
        en: `${customerFirstName} chose another private chef. This request is no longer available.`,
    }[locale];
    const closing = {
        de: 'Aber keine Sorge: schon bald gibt es neue Anfragen in deiner Nähe! Halte Ausschau und reagiere schnell, um dir die nächste Buchung zu sichern.',
        en: "Don't worry: new requests near you will show up soon. Keep an eye on the pool and respond quickly to land your next booking.",
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText>{closing}</EmailText>
        </EmailLayout>
    );
}

export function userBookingRequestOfferAcceptForNotChosenCookEmailSubject(locale: Locale): string {
    return { de: 'Anfrage anderweitig vergeben', en: 'Request went to another chef' }[locale];
}
