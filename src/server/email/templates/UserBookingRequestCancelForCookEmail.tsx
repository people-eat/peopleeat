import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface UserBookingRequestCancelForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    reason?: string | null;
}

export function UserBookingRequestCancelForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    reason,
}: UserBookingRequestCancelForCookEmailProps) {
    const subject = userBookingRequestCancelForCookEmailSubject(locale);
    const preview = {
        de: 'Eine Anfrage wurde zurückgezogen. Neue Chancen warten im Pool',
        en: 'A request was withdrawn. New opportunities await in the pool',
    }[locale];
    const intro = {
        de: 'Eine Anfrage, für die du ein Angebot erstellt hattest, wurde zurückgezogen. Dein Angebot erlischt damit.',
        en: 'A booking request you had offered on was withdrawn. Your offer is no longer valid.',
    }[locale];
    const reasonLabel = { de: 'Grund', en: 'Reason' }[locale];
    const closing = {
        de: 'Halte weiter Ausschau im Buchungsanfragen-Pool, um neue Gelegenheiten nicht zu verpassen. Wir informieren dich auch per E-Mail über neue Anfragen in deiner Region.',
        en: "Keep an eye on the booking request pool so you don't miss new opportunities. We'll also email you about new requests in your area.",
    }[locale];
    const trimmedReason = reason?.trim() || null;

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            {trimmedReason ? (
                <EmailText>
                    {reasonLabel}: {trimmedReason}
                </EmailText>
            ) : null}
            <EmailText>{closing}</EmailText>
        </EmailLayout>
    );
}

export function userBookingRequestCancelForCookEmailSubject(locale: Locale): string {
    return { de: 'Anfrage wurde storniert', en: 'Request was canceled' }[locale];
}
