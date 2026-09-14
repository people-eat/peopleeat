import { EmailLayout } from '../../components/EmailLayout';
import { EmailText } from '../../components/EmailText';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function EmailLayoutEnPreview() {
    return (
        <EmailLayout
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            preview="Preview of the shared email shell"
            subject="Example subject"
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        >
            <EmailText>This is the email body. Template-specific content goes here.</EmailText>
        </EmailLayout>
    );
}
