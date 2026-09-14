import { AuthEmailOtpRequestForUserEmail } from '../../templates/AuthEmailOtpRequestForUserEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function AuthEmailOtpRequestForUserEmailEnPreview() {
    return (
        <AuthEmailOtpRequestForUserEmail
            code={emailPreviewFixtures.otpCode}
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        />
    );
}
