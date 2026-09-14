import { UserBookingRequestCancelForCustomerEmail } from '../../templates/UserBookingRequestCancelForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestCancelForCustomerEmailEnPreview() {
    return (
        <UserBookingRequestCancelForCustomerEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        />
    );
}
