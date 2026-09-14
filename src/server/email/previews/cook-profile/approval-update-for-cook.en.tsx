import { AdminCookApprovalUpdateForCookEmail } from '../../templates/AdminCookApprovalUpdateForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function AdminCookApprovalUpdateForCookEmailEnPreview() {
    return (
        <AdminCookApprovalUpdateForCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            profileUrl={`${emailPreviewFixtures.webPageUrl}/profile`}
        />
    );
}
