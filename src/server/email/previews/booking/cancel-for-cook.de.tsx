import { UserBookingRequestCancelForCookEmail } from '../../templates/UserBookingRequestCancelForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestCancelForCookEmailDePreview() {
    return (
        <UserBookingRequestCancelForCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            reason={emailPreviewFixtures.booking.cancelReason}
        />
    );
}
