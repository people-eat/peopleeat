import { UserSupportRequestCreateForCustomerEmail } from '../../templates/UserSupportRequestCreateForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

const supportRequestId = 'sr_preview_01example';

export default function UserSupportRequestCreateForCustomerEmailDePreview() {
    return (
        <UserSupportRequestCreateForCustomerEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            subject="Frage zur Zahlung"
            supportRequestUrl={`${emailPreviewFixtures.webPageUrl}/profile/support-requests/${supportRequestId}`}
        />
    );
}
