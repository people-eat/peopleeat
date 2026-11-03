import { AccountDeleteOtpRequestForUserEmail } from '../../templates/AccountDeleteOtpRequestForUserEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function AccountDeleteOtpRequestForUserEmailDePreview() {
    return (
        <AccountDeleteOtpRequestForUserEmail
            code={emailPreviewFixtures.otpCode}
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        />
    );
}
