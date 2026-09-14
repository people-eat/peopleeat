import { UserBookingRequestUpdateForCookEmail } from '../../templates/UserBookingRequestUpdateForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestUpdateForCookEmailEnPreview() {
    return (
        <UserBookingRequestUpdateForCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            customerFirstName={emailPreviewFixtures.booking.customerFirstName}
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/${emailPreviewFixtures.booking.bookingRequestOfferId}`}
        />
    );
}
