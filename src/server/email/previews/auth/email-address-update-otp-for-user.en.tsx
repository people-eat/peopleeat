import { EmailAddressUpdateOtpRequestForUserEmail } from '../../templates/EmailAddressUpdateOtpRequestForUserEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function EmailAddressUpdateOtpRequestForUserEmailEnPreview() {
    return (
        <EmailAddressUpdateOtpRequestForUserEmail
            code={emailPreviewFixtures.otpCode}
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        />
    );
}
