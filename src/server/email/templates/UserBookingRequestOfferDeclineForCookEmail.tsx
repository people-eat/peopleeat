import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface UserBookingRequestOfferDeclineForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
    reason?: string | null;
}

export function UserBookingRequestOfferDeclineForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
    reason,
}: UserBookingRequestOfferDeclineForCookEmailProps) {
    const subject = userBookingRequestOfferDeclineForCookEmailSubject(locale);
    const preview = {
        de: `${customerFirstName} hat dein Angebot nicht gewählt. Neue Anfragen warten`,
        en: `${customerFirstName} didn't choose your offer. New requests await`,
    }[locale];
    const intro = {
        de: `${customerFirstName} hat dein Angebot leider nicht überzeugt.`,
        en: `${customerFirstName} decided not to go ahead with your offer.`,
    }[locale];
    const reasonLabel = { de: 'Absagegrund', en: 'Decline reason' }[locale];
    const closing = {
        de: 'Aber keine Sorge: es wird noch viele weitere Gelegenheiten geben. Halte Ausschau im Buchungsanfragen-Pool. Wir informieren dich auch per E-Mail, wenn es neue Buchungsanfragen gibt.',
        en: "Don't worry: there will be many more opportunities. Keep an eye on the booking request pool. We'll also email you when new requests come in.",
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

export function userBookingRequestOfferDeclineForCookEmailSubject(locale: Locale): string {
    return { de: 'Angebot wurde abgelehnt', en: 'Offer was declined' }[locale];
}
