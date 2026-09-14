import { BookingRequestOfferChatMessageNotifyForCookEmail } from '../../templates/BookingRequestOfferChatMessageNotifyForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferChatMessageNotifyForCookEmailDePreview() {
    return (
        <BookingRequestOfferChatMessageNotifyForCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.booking.cookFirstName}
            senderFirstName={emailPreviewFixtures.booking.customerFirstName}
            messageBody="Super, danke! Können wir den Vorspeisen-Gang vegetarisch halten?"
            chatUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/${emailPreviewFixtures.booking.bookingRequestOfferId}?tab=chat`}
        />
    );
}
