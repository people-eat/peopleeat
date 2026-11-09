import type { Locale } from '../../../shared/locale';
import { formatCallSlotDate, formatCallSlotTime } from './bookingRequestOfferCallSlotEmailFormat';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotCancelBodyProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    cancelerFirstName: string;
    startAt: Date;
    whenSecondary?: string | null;
    reason?: string;
    wasConfirmed: boolean;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotCancelBody({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    cancelerFirstName,
    startAt,
    whenSecondary,
    reason,
    wasConfirmed,
    offerUrl,
}: BookingRequestOfferCallSlotCancelBodyProps) {
    const callDate = formatCallSlotDate(startAt, locale, timeZone);
    const callTime = formatCallSlotTime(startAt, locale, timeZone);
    const trimmedReason = reason?.trim() || undefined;
    const preview = {
        de: `${cancelerFirstName} hat den Video-Call abgesagt. Neuen Termin vereinbaren`,
        en: `${cancelerFirstName} canceled the video call. Schedule a new time`,
    }[locale];
    const subject = bookingRequestOfferCallSlotCancelEmailSubject(locale);
    const intro = {
        de: wasConfirmed
            ? `${cancelerFirstName} hat den bestätigten Video-Call abgesagt:`
            : `${cancelerFirstName} hat die Video-Call-Anfrage zurückgezogen:`,
        en: wasConfirmed
            ? `${cancelerFirstName} canceled the confirmed video call:`
            : `${cancelerFirstName} withdrew the video call request:`,
    }[locale];
    const reasonLine = trimmedReason
        ? {
              de: `Grund: ${trimmedReason}`,
              en: `Reason: ${trimmedReason}`,
          }[locale]
        : undefined;
    const nextStep = {
        de: 'Du kannst gerne einen neuen Termin vereinbaren.',
        en: 'Feel free to schedule a new time.',
    }[locale];
    const calendarRemoval = wasConfirmed
        ? {
              de: 'Falls du den Termin gespeichert hast, nimm ihn bitte aus dem Kalender.',
              en: 'If you saved this, please remove it from your calendar.',
          }[locale]
        : undefined;
    const linkLabel = {
        de: 'Zum Angebot',
        en: 'Open the offer',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>{callDate}</EmailText>
            <EmailText>{callTime}</EmailText>
            {whenSecondary ? <EmailText>{whenSecondary}</EmailText> : null}
            {reasonLine ? <EmailText>{reasonLine}</EmailText> : null}
            <EmailText>{nextStep}</EmailText>
            {calendarRemoval ? <EmailText>{calendarRemoval}</EmailText> : null}
            <EmailButton href={offerUrl}>{linkLabel}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotCancelEmailSubject(locale: Locale): string {
    return {
        de: 'Video-Call abgesagt',
        en: 'Video call canceled',
    }[locale];
}
