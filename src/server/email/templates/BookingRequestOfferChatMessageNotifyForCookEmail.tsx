import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import {
    BookingRequestOfferChatMessageNotifyBody,
    bookingRequestOfferChatMessageNotifyHeading,
    bookingRequestOfferChatMessageNotifyPreview,
} from '../components/BookingRequestOfferChatMessageNotifyBody';
import { EmailLayout } from '../components/EmailLayout';
import { EmailNewMessageHero } from '../components/EmailNewMessageHero';

interface BookingRequestOfferChatMessageNotifyForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    senderFirstName: string;
    messageBody: string;
    chatUrl: string;
}

export function BookingRequestOfferChatMessageNotifyForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    senderFirstName,
    messageBody,
    chatUrl,
}: BookingRequestOfferChatMessageNotifyForCookEmailProps) {
    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={bookingRequestOfferChatMessageNotifyPreview(locale, senderFirstName)}
            subject={bookingRequestOfferChatMessageNotifyHeading(locale)}
            recipientFirstName={recipientFirstName}
            hero={<EmailNewMessageHero webPageUrl={webPageUrl} />}
        >
            <BookingRequestOfferChatMessageNotifyBody
                locale={locale}
                senderFirstName={senderFirstName}
                messageBody={messageBody}
                chatUrl={chatUrl}
            />
        </EmailLayout>
    );
}

export function bookingRequestOfferChatMessageNotifyForCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'chat.notify.subject');
}
