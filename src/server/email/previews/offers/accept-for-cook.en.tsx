import { UserBookingRequestOfferAcceptForCookEmail } from '../../templates/UserBookingRequestOfferAcceptForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestOfferAcceptForCookEmailEnPreview() {
    return (
        <UserBookingRequestOfferAcceptForCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            customerFirstName={emailPreviewFixtures.booking.customerFirstName}
            chatUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/${emailPreviewFixtures.booking.bookingRequestOfferId}?tab=chat`}
        />
    );
}
