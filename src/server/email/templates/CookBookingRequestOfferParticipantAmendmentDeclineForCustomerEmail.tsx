import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface Props {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    cookFirstName: string;
    offerUrl: string;
}

export function CookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    cookFirstName,
    offerUrl,
}: Props) {
    const subject = cookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmailSubject(locale);
    const preview = {
        de: `${cookFirstName} hat die Teilnehmeränderung abgelehnt`,
        en: `${cookFirstName} declined the participant change`,
    }[locale];
    const body = {
        de: `${cookFirstName} hat deine vorgeschlagene Änderung der Teilnehmerzahl abgelehnt. Die Buchung bleibt unverändert. Du kannst dich über den Chat melden, falls du etwas klären möchtest.`,
        en: `${cookFirstName} declined your proposed participant change. The booking stays unchanged. You can reach out in chat if you want to discuss it.`,
    }[locale];
    const cta = { de: 'Angebot ansehen', en: 'View offer' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailButton href={offerUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function cookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Teilnehmeränderung abgelehnt', en: 'Participant change declined' }[locale];
}
