import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotDeclineBodyProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    declinerFirstName: string;
    reason?: string;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotDeclineBody({
    locale,
    webPageUrl,
    recipientFirstName,
    declinerFirstName,
    reason,
    offerUrl,
}: BookingRequestOfferCallSlotDeclineBodyProps) {
    const trimmedReason = reason?.trim() || undefined;
    const preview = {
        de: `${declinerFirstName} kann den Termin nicht. Gerne einen neuen vorschlagen`,
        en: `${declinerFirstName} can't make that time. Feel free to propose another`,
    }[locale];
    const subject = bookingRequestOfferCallSlotDeclineEmailSubject(locale);
    const intro = {
        de: `${declinerFirstName} kann den gewünschten Termin leider nicht wahrnehmen.`,
        en: `${declinerFirstName} cannot take the proposed time.`,
    }[locale];
    const reasonLine = trimmedReason
        ? {
              de: `Grund: ${trimmedReason}`,
              en: `Reason: ${trimmedReason}`,
          }[locale]
        : undefined;
    const nextStep = {
        de: 'Du kannst gerne einen neuen Termin anfragen.',
        en: 'Feel free to request a new time.',
    }[locale];
    const linkLabel = {
        de: 'Zum Angebot',
        en: 'Open the offer',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            {reasonLine ? <EmailText>{reasonLine}</EmailText> : null}
            <EmailText>{nextStep}</EmailText>
            <EmailButton href={offerUrl}>{linkLabel}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotDeclineEmailSubject(locale: Locale): string {
    return {
        de: 'Dein Video-Call konnte leider nicht bestätigt werden',
        en: 'Your video call could not be confirmed',
    }[locale];
}
