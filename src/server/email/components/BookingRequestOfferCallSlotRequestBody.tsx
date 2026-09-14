import type { Locale } from '../../../shared/locale';
import { formatCallSlotDate, formatCallSlotTime } from './bookingRequestOfferCallSlotEmailFormat';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotRequestBodyProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    senderFirstName: string;
    startAt: Date;
    eventDateTime: Date;
    occasion: string;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotRequestBody({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    senderFirstName,
    startAt,
    eventDateTime,
    occasion,
    offerUrl,
}: BookingRequestOfferCallSlotRequestBodyProps) {
    const callDate = formatCallSlotDate(startAt, locale, timeZone);
    const callTime = formatCallSlotTime(startAt, locale, timeZone);
    const eventDate = formatCallSlotDate(eventDateTime, locale, timeZone);
    const preview = {
        de: `${senderFirstName} möchte dich per Video-Call kennenlernen. Termin bestätigen`,
        en: `${senderFirstName} wants to meet you on a video call. Confirm the time`,
    }[locale];
    const subject = bookingRequestOfferCallSlotRequestEmailSubject(locale);
    const intro = {
        de: `${senderFirstName} möchte einen Video-Call mit dir vereinbaren, um dich kennenzulernen und Details zum Event zu besprechen. Bitte bestätige oder lehne den Termin ab.`,
        en: `${senderFirstName} would like to schedule a video call with you to get to know each other and discuss the event details. Please confirm or decline the proposed time.`,
    }[locale];
    const proposalHeading = {
        de: 'Video-Call Vorschlag',
        en: 'Proposed video call',
    }[locale];
    const eventHeading = {
        de: 'Zum Event',
        en: 'About the event',
    }[locale];
    const eventDateLabel = {
        de: 'Datum',
        en: 'Event date',
    }[locale];
    const occasionLabel = {
        de: 'Anlass',
        en: 'Occasion',
    }[locale];
    const linkLabel = {
        de: 'Zum Angebot',
        en: 'Open the offer',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText style={{ marginBottom: '8px' }}>{proposalHeading}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>{callDate}</EmailText>
            <EmailText>{callTime}</EmailText>
            <EmailText style={{ marginBottom: '8px' }}>{eventHeading}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>
                {eventDateLabel}: {eventDate}
            </EmailText>
            <EmailText>
                {occasionLabel}: {occasion}
            </EmailText>
            <EmailButton href={offerUrl}>{linkLabel}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotRequestEmailSubject(locale: Locale): string {
    return {
        de: 'Neue Video-Call-Anfrage',
        en: 'New video call request',
    }[locale];
}
