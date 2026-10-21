import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface Props {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    cookFirstName: string;
    offerUrl: string;
    customerDeltaCents: number;
}

export function CookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    cookFirstName,
    offerUrl,
    customerDeltaCents,
}: Props) {
    const subject = cookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmailSubject(locale);
    const preview = {
        de: `${cookFirstName} hat die Teilnehmeränderung angenommen`,
        en: `${cookFirstName} accepted the participant change`,
    }[locale];
    const moneyNote =
        customerDeltaCents < 0
            ? {
                  de: ' Die Differenz wird dir erstattet.',
                  en: ' The difference will be refunded to you.',
              }[locale]
            : customerDeltaCents > 0
              ? {
                    de: ' Die Differenz wird über deine hinterlegte Zahlungsmethode nachträglich belastet.',
                    en: ' The difference will be charged to your saved payment method.',
                }[locale]
              : '';
    const body = {
        de: `${cookFirstName} hat deine Änderung der Teilnehmerzahl angenommen.${moneyNote} Du findest die aktualisierten Details in deinem Angebot.`,
        en: `${cookFirstName} accepted your participant change.${moneyNote} You can see the updated details on your offer.`,
    }[locale];
    const cta = { de: 'Angebot ansehen', en: 'View offer' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailButton href={offerUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function cookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Teilnehmeränderung angenommen', en: 'Participant change accepted' }[locale];
}
