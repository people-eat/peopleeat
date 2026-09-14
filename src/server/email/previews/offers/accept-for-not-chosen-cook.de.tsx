import { UserBookingRequestOfferAcceptForNotChosenCookEmail } from '../../templates/UserBookingRequestOfferAcceptForNotChosenCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestOfferAcceptForNotChosenCookEmailDePreview() {
    return (
        <UserBookingRequestOfferAcceptForNotChosenCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            customerFirstName={emailPreviewFixtures.booking.customerFirstName}
        />
    );
}
