import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface UserBookingRequestCancelForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
}

export function UserBookingRequestCancelForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
}: UserBookingRequestCancelForCustomerEmailProps) {
    const subject = userBookingRequestCancelForCustomerEmailSubject(locale);
    const preview = {
        de: 'Deine Stornierung ist bestätigt. Wir sind da, wenn du wieder buchst',
        en: "Your cancellation is confirmed. We're here when you're ready again",
    }[locale];
    const body = {
        de: 'Schade, dass du deine Anfrage storniert hast. Wir hoffen, dass es beim nächsten Mal klappt und stehen dir jederzeit gerne zur Verfügung, wenn du wieder Interesse an einem Privatkoch hast.',
        en: "Sorry to see you cancel your request. We hope it works out next time. We're here whenever you'd like a private chef again.",
    }[locale];
    const closing = {
        de: 'Alles Gute und bis bald!',
        en: 'All the best, see you soon!',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailText>{closing}</EmailText>
        </EmailLayout>
    );
}

export function userBookingRequestCancelForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Stornierung', en: 'Cancellation' }[locale];
}
