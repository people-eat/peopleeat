import { UserSupportRequestCreateForCustomerEmail } from '../../templates/UserSupportRequestCreateForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

const supportRequestId = 'sr_preview_01example';

export default function UserSupportRequestCreateForCustomerEmailEnPreview() {
    return (
        <UserSupportRequestCreateForCustomerEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            subject="Question about payment"
            supportRequestUrl={`${emailPreviewFixtures.webPageUrl}/profile/support-requests/${supportRequestId}`}
        />
    );
}
