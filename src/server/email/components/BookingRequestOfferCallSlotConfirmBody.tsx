import type { Locale } from '../../../shared/locale';
import { formatCallSlotDate, formatCallSlotTime } from './bookingRequestOfferCallSlotEmailFormat';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotConfirmBodyProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    accepterFirstName: string;
    startAt: Date;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotConfirmBody({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    accepterFirstName,
    startAt,
    offerUrl,
}: BookingRequestOfferCallSlotConfirmBodyProps) {
    const callDate = formatCallSlotDate(startAt, locale, timeZone);
    const callTime = formatCallSlotTime(startAt, locale, timeZone);
    const preview = {
        de: `${accepterFirstName} hat deinen Video-Call bestätigt. Termin steht`,
        en: `${accepterFirstName} confirmed your video call. You're all set`,
    }[locale];
    const subject = bookingRequestOfferCallSlotConfirmEmailSubject(locale);
    const intro = {
        de: `${accepterFirstName} hat deine Video-Call-Anfrage bestätigt:`,
        en: `${accepterFirstName} confirmed your video call request:`,
    }[locale];
    const reminderNote = {
        de: 'Du erhältst 60 Minuten vor Beginn eine Erinnerung mit dem Link zum Video-Call.',
        en: 'You will receive a reminder with the video call link 60 minutes before it starts.',
    }[locale];
    const linkLabel = {
        de: 'Zum Angebot',
        en: 'Open the offer',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>{callDate}</EmailText>
            <EmailText>{callTime}</EmailText>
            <EmailText>{reminderNote}</EmailText>
            <EmailButton href={offerUrl}>{linkLabel}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotConfirmEmailSubject(locale: Locale): string {
    return {
        de: 'Dein Video-Call wurde bestätigt',
        en: 'Your video call was confirmed',
    }[locale];
}
