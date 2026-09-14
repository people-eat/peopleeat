import type { Locale } from '../../../shared/locale';
import {
    BookingRequestOfferChatMessageNotifyBody,
    bookingRequestOfferChatMessageNotifyHeading,
    bookingRequestOfferChatMessageNotifyPreview,
} from '../components/BookingRequestOfferChatMessageNotifyBody';
import { EmailLayout } from '../components/EmailLayout';
import { EmailNewMessageHero } from '../components/EmailNewMessageHero';

interface BookingRequestOfferChatMessageNotifyForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    senderFirstName: string;
    messageBody: string;
    chatUrl: string;
}

export function BookingRequestOfferChatMessageNotifyForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    senderFirstName,
    messageBody,
    chatUrl,
}: BookingRequestOfferChatMessageNotifyForCustomerEmailProps) {
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

export function bookingRequestOfferChatMessageNotifyForCustomerEmailSubject(locale: Locale): string {
    return {
        de: 'Zu einem deiner Angebote gibt es eine neue Nachricht.',
        en: 'There is a new message on one of your offers.',
    }[locale];
}
