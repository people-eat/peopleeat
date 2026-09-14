import { AdminSupportRequestMessageCreateForCustomerEmail } from '../../templates/AdminSupportRequestMessageCreateForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

const supportRequestId = 'sr_preview_01example';

export default function AdminSupportRequestMessageCreateForCustomerEmailDePreview() {
    return (
        <AdminSupportRequestMessageCreateForCustomerEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            subject="Frage zur Zahlung"
            supportRequestUrl={`${emailPreviewFixtures.webPageUrl}/profile/support-requests/${supportRequestId}`}
        />
    );
}
