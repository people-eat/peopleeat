import { tEmail } from '../../../i18n/tEmail';
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
    return (
        <>
            <EmailText>{tEmail(locale, 'chat.notify.intro', { senderFirstName })}</EmailText>
            <EmailChatBubble>{messageBody}</EmailChatBubble>
            <EmailButton href={chatUrl}>{tEmail(locale, 'chat.notify.cta')}</EmailButton>
        </>
    );
}

export function bookingRequestOfferChatMessageNotifyHeading(locale: Locale): string {
    return tEmail(locale, 'chat.notify.heading');
}

export function bookingRequestOfferChatMessageNotifyPreview(locale: Locale, senderFirstName: string): string {
    return tEmail(locale, 'chat.notify.preview', { senderFirstName });
}

export function bookingRequestOfferChatMessageNotifyAttachmentFallback(locale: Locale): string {
    return tEmail(locale, 'chat.notify.attachment');
}
