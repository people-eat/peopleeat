import { AccountDeleteOtpRequestForUserEmail } from '../../templates/AccountDeleteOtpRequestForUserEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function AccountDeleteOtpRequestForUserEmailEnPreview() {
    return (
        <AccountDeleteOtpRequestForUserEmail
            code={emailPreviewFixtures.otpCode}
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        />
    );
}
