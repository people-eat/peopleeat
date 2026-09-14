import { UserBookingRequestUpdateForCookEmail } from '../../templates/UserBookingRequestUpdateForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestUpdateForCookEmailDePreview() {
    return (
        <UserBookingRequestUpdateForCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            customerFirstName={emailPreviewFixtures.booking.customerFirstName}
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/${emailPreviewFixtures.booking.bookingRequestOfferId}`}
        />
    );
}
