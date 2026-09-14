import { BookingRequestOfferChatMessageNotifyForCookEmail } from '../../templates/BookingRequestOfferChatMessageNotifyForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferChatMessageNotifyForCookEmailEnPreview() {
    return (
        <BookingRequestOfferChatMessageNotifyForCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.booking.cookFirstName}
            senderFirstName={emailPreviewFixtures.booking.customerFirstName}
            messageBody="Perfect, thanks! Could we keep the starter course vegetarian?"
            chatUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/${emailPreviewFixtures.booking.bookingRequestOfferId}?tab=chat`}
        />
    );
}
