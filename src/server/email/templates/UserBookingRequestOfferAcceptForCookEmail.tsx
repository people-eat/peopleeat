import { formatBookingEventWhenFromCountry, formatBookingWhenJoined } from '../../../shared/formatBookingWhen';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface UserBookingRequestOfferAcceptForCookEmailProps {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    venueCity?: string | null;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
    occasion: string;
    startAt: Date;
    venue: string;
    chatUrl: string;
}

export function UserBookingRequestOfferAcceptForCookEmail({
    locale,
    timeZone,
    venueCountry,
    venueCity,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
    occasion,
    startAt,
    venue,
    chatUrl,
}: UserBookingRequestOfferAcceptForCookEmailProps) {
    const subject = userBookingRequestOfferAcceptForCookEmailSubject(locale);
    const preview = {
        de: `Tolle Neuigkeiten: ${customerFirstName} hat deinen Menüvorschlag akzeptiert`,
        en: `Great news: ${customerFirstName} accepted your menu proposal`,
    }[locale];
    const intro = {
        de: `Tolle Neuigkeiten! ${customerFirstName} hat deinen Menüvorschlag akzeptiert. Jetzt könnt ihr die letzten Details direkt im Chat auf peopleeat besprechen.`,
        en: `Great news! ${customerFirstName} accepted your menu proposal. You can now sort out the remaining details together in chat on peopleeat.`,
    }[locale];
    const when = formatBookingWhenJoined(
        formatBookingEventWhenFromCountry({
            instant: startAt,
            locale,
            viewerTimeZone: timeZone,
            venueCountry,
            venueCity,
            dateStyle: 'long',
        }),
    );
    const eventLine = { de: `${occasion} · ${when}`, en: `${occasion} · ${when}` }[locale];
    const venueLine = { de: `Ort: ${venue}`, en: `Venue: ${venue}` }[locale];
    const calendarNote = {
        de: 'Im Anhang ist eine Kalenderdatei. Die Uhrzeit ist der Beginn, und sie erinnert dich einen Tag vorher.',
        en: 'A calendar file is attached. The time is the start, and it reminds you the day before.',
    }[locale];
    const nudge = {
        de: 'Schreibe dem Kunden am besten zeitnah, um alles Wichtige für das Event zu klären.',
        en: 'Reach out to the customer soon so you can align on everything important for the event.',
    }[locale];
    const closing = { de: 'Viel Erfolg!', en: "You've got this!" }[locale];
    const cta = { de: 'Zum Chat', en: 'Open chat' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText>{eventLine}</EmailText>
            <EmailText>{venueLine}</EmailText>
            <EmailText>{calendarNote}</EmailText>
            <EmailText>{nudge}</EmailText>
            <EmailText>{closing}</EmailText>
            <EmailButton href={chatUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function userBookingRequestOfferAcceptForCookEmailSubject(locale: Locale): string {
    return { de: 'Angebot wurde akzeptiert', en: 'Offer was accepted' }[locale];
}
