import { AdminSupportRequestResolveForCustomerEmail } from '../../templates/AdminSupportRequestResolveForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

const supportRequestId = 'sr_preview_01example';

export default function AdminSupportRequestResolveForCustomerEmailEnPreview() {
    return (
        <AdminSupportRequestResolveForCustomerEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            subject="Question about payment"
            supportRequestUrl={`${emailPreviewFixtures.webPageUrl}/profile/support-requests/${supportRequestId}`}
        />
    );
}
