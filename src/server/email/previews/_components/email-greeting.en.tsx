import { EmailGreeting } from '../../components/EmailGreeting';
import { EmailComponentPreview, emailPreviewFixtures } from '../emailPreviewUtils';

export default function EmailGreetingEnPreview() {
    return (
        <EmailComponentPreview locale="en">
            <EmailGreeting locale="en" recipientFirstName={emailPreviewFixtures.recipientFirstName} />
        </EmailComponentPreview>
    );
}
