import { AdminCookApprovalUpdateForCookEmail } from '../../templates/AdminCookApprovalUpdateForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function AdminCookApprovalUpdateForCookEmailDePreview() {
    return (
        <AdminCookApprovalUpdateForCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            profileUrl={`${emailPreviewFixtures.webPageUrl}/profile`}
        />
    );
}
