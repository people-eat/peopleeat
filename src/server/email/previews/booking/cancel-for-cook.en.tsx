import { UserBookingRequestCancelForCookEmail } from '../../templates/UserBookingRequestCancelForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestCancelForCookEmailEnPreview() {
    return (
        <UserBookingRequestCancelForCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            reason={emailPreviewFixtures.booking.cancelReason}
        />
    );
}
