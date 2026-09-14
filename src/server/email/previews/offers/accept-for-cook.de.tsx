import { UserBookingRequestOfferAcceptForCookEmail } from '../../templates/UserBookingRequestOfferAcceptForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestOfferAcceptForCookEmailDePreview() {
    return (
        <UserBookingRequestOfferAcceptForCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            customerFirstName={emailPreviewFixtures.booking.customerFirstName}
            chatUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/${emailPreviewFixtures.booking.bookingRequestOfferId}?tab=chat`}
        />
    );
}
