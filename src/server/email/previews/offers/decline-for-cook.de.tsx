import { UserBookingRequestOfferDeclineForCookEmail } from '../../templates/UserBookingRequestOfferDeclineForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestOfferDeclineForCookEmailDePreview() {
    return (
        <UserBookingRequestOfferDeclineForCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            customerFirstName={emailPreviewFixtures.booking.customerFirstName}
            reason={emailPreviewFixtures.booking.declineReason}
        />
    );
}
