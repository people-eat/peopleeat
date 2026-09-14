import { BookingRequestOfferChatMessageNotifyForCustomerEmail } from '../../templates/BookingRequestOfferChatMessageNotifyForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferChatMessageNotifyForCustomerEmailEnPreview() {
    return (
        <BookingRequestOfferChatMessageNotifyForCustomerEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            senderFirstName={emailPreviewFixtures.booking.cookFirstName}
            messageBody="Hi! I'd like to lighten the menu a bit. Does that work for you?"
            chatUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}/offers/${emailPreviewFixtures.booking.bookingRequestOfferId}?tab=chat`}
        />
    );
}
