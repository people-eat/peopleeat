import { UserBookingRequestCancelForCustomerEmail } from '../../templates/UserBookingRequestCancelForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestCancelForCustomerEmailDePreview() {
    return (
        <UserBookingRequestCancelForCustomerEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        />
    );
}
