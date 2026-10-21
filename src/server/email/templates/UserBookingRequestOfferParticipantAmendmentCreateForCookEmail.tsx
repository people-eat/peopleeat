import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface Props {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
    offerUrl: string;
}

export function UserBookingRequestOfferParticipantAmendmentCreateForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
    offerUrl,
}: Props) {
    const subject = userBookingRequestOfferParticipantAmendmentCreateForCookEmailSubject(locale);
    const preview = {
        de: `${customerFirstName} möchte die Teilnehmerzahl ändern`,
        en: `${customerFirstName} wants to change the number of participants`,
    }[locale];
    const body = {
        de: `${customerFirstName} hat eine Änderung der Teilnehmerzahl vorgeschlagen. Bitte prüfe den Vorschlag und nimm ihn an oder lehne ihn ab. Die Buchung bleibt unverändert, bis du entscheidest.`,
        en: `${customerFirstName} proposed a change to the number of participants. Please review the proposal and accept or decline it. The booking stays unchanged until you decide.`,
    }[locale];
    const cta = { de: 'Vorschlag prüfen', en: 'Review proposal' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailButton href={offerUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function userBookingRequestOfferParticipantAmendmentCreateForCookEmailSubject(locale: Locale): string {
    return { de: 'Teilnehmeränderung vorgeschlagen', en: 'Participant change proposed' }[locale];
}
