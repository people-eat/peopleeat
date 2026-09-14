import { EmailHeader } from '../../components/EmailHeader';
import { EmailComponentPreview, emailPreviewFixtures } from '../emailPreviewUtils';

export default function EmailHeaderPreview() {
    return (
        <EmailComponentPreview locale="en">
            <EmailHeader webPageUrl={emailPreviewFixtures.webPageUrl} />
        </EmailComponentPreview>
    );
}
