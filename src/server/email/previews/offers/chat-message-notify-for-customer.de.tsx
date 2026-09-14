import { BookingRequestOfferChatMessageNotifyForCustomerEmail } from '../../templates/BookingRequestOfferChatMessageNotifyForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferChatMessageNotifyForCustomerEmailDePreview() {
    return (
        <BookingRequestOfferChatMessageNotifyForCustomerEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            senderFirstName={emailPreviewFixtures.booking.cookFirstName}
            messageBody="Hallo! Ich würde das Menü gerne etwas leichter gestalten. Passt das für dich?"
            chatUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}/offers/${emailPreviewFixtures.booking.bookingRequestOfferId}?tab=chat`}
        />
    );
}
