import { AdminSupportRequestResolveForCustomerEmail } from '../../templates/AdminSupportRequestResolveForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

const supportRequestId = 'sr_preview_01example';

export default function AdminSupportRequestResolveForCustomerEmailDePreview() {
    return (
        <AdminSupportRequestResolveForCustomerEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            subject="Frage zur Zahlung"
            supportRequestUrl={`${emailPreviewFixtures.webPageUrl}/profile/support-requests/${supportRequestId}`}
        />
    );
}
