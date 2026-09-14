import { UserBookingRequestOfferAcceptForNotChosenCookEmail } from '../../templates/UserBookingRequestOfferAcceptForNotChosenCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestOfferAcceptForNotChosenCookEmailEnPreview() {
    return (
        <UserBookingRequestOfferAcceptForNotChosenCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            customerFirstName={emailPreviewFixtures.booking.customerFirstName}
        />
    );
}
