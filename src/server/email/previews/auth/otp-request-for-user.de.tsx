import { AuthEmailOtpRequestForUserEmail } from '../../templates/AuthEmailOtpRequestForUserEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function AuthEmailOtpRequestForUserEmailDePreview() {
    return (
        <AuthEmailOtpRequestForUserEmail
            code={emailPreviewFixtures.otpCode}
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        />
    );
}
