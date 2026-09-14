import type { Locale } from '../../../shared/locale';
import { formatCallSlotDate, formatCallSlotTime } from './bookingRequestOfferCallSlotEmailFormat';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotReminderBodyProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    startAt: Date;
    counterpartyFirstName: string;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotReminderBody({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    startAt,
    counterpartyFirstName,
    offerUrl,
}: BookingRequestOfferCallSlotReminderBodyProps) {
    const callDate = formatCallSlotDate(startAt, locale, timeZone);
    const callTime = formatCallSlotTime(startAt, locale, timeZone);
    const preview = {
        de: `Dein Video-Call mit ${counterpartyFirstName} startet in 60 Minuten. Link innen`,
        en: `Your video call with ${counterpartyFirstName} starts in 60 minutes. Link inside`,
    }[locale];
    const subject = bookingRequestOfferCallSlotReminderEmailSubject(locale);
    const intro = {
        de: `Dein Video-Call mit ${counterpartyFirstName} beginnt in 60 Minuten.`,
        en: `Your video call with ${counterpartyFirstName} starts in 60 minutes.`,
    }[locale];
    const closing = {
        de: 'Wir wünschen dir ein angenehmes Gespräch! Über den folgenden Link kannst du dem Call beitreten:',
        en: 'We hope you have a great conversation! Use the link below to join the call:',
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
            <EmailText>{closing}</EmailText>
            <EmailButton href={offerUrl}>{linkLabel}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotReminderEmailSubject(locale: Locale): string {
    return {
        de: 'Erinnerung: Video-Call in 60 Minuten',
        en: 'Reminder: video call in 60 minutes',
    }[locale];
}
