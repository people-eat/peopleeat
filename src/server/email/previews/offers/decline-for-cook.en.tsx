import { UserBookingRequestOfferDeclineForCookEmail } from '../../templates/UserBookingRequestOfferDeclineForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestOfferDeclineForCookEmailEnPreview() {
    return (
        <UserBookingRequestOfferDeclineForCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            customerFirstName={emailPreviewFixtures.booking.customerFirstName}
            reason={emailPreviewFixtures.booking.declineReason}
        />
    );
}
