import { EmailFooter } from '../../components/EmailFooter';
import { EmailComponentPreview, emailPreviewFixtures } from '../emailPreviewUtils';

export default function EmailFooterPreview() {
    return (
        <EmailComponentPreview locale="en">
            <EmailFooter webPageUrl={emailPreviewFixtures.webPageUrl} />
        </EmailComponentPreview>
    );
}
