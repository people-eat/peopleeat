import type { Locale } from '../../../shared/locale';
import { EmailButton } from './EmailButton';
import { EmailChatBubble } from './EmailChatBubble';
import { EmailText } from './EmailText';

interface BookingRequestOfferChatMessageNotifyBodyProps {
    locale: Locale;
    senderFirstName: string;
    messageBody: string;
    chatUrl: string;
}

/** Shared body for cook↔customer offer-chat message notify emails. */
export function BookingRequestOfferChatMessageNotifyBody({
    locale,
    senderFirstName,
    messageBody,
    chatUrl,
}: BookingRequestOfferChatMessageNotifyBodyProps) {
    const intro = {
        de: `du hast eine neue Nachricht von ${senderFirstName} erhalten.`,
        en: `you received a new message from ${senderFirstName}.`,
    }[locale];
    const cta = { de: 'Im Chat anzeigen', en: 'View in chat' }[locale];

    return (
        <>
            <EmailText>{intro}</EmailText>
            <EmailChatBubble>{messageBody}</EmailChatBubble>
            <EmailButton href={chatUrl}>{cta}</EmailButton>
        </>
    );
}

export function bookingRequestOfferChatMessageNotifyHeading(locale: Locale): string {
    return { de: 'Du hast eine neue Nachricht!', en: 'You have a new message!' }[locale];
}

export function bookingRequestOfferChatMessageNotifyPreview(locale: Locale, senderFirstName: string): string {
    return {
        de: `Neue Nachricht von ${senderFirstName}. Jetzt im Chat lesen`,
        en: `New message from ${senderFirstName}. Read it in chat`,
    }[locale];
}

export function bookingRequestOfferChatMessageNotifyAttachmentFallback(locale: Locale): string {
    return { de: '(Anhang)', en: '(Attachment)' }[locale];
}
