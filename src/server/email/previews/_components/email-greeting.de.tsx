import { EmailGreeting } from '../../components/EmailGreeting';
import { EmailComponentPreview, emailPreviewFixtures } from '../emailPreviewUtils';

export default function EmailGreetingDePreview() {
    return (
        <EmailComponentPreview locale="de">
            <EmailGreeting locale="de" recipientFirstName={emailPreviewFixtures.recipientFirstName} />
        </EmailComponentPreview>
    );
}
