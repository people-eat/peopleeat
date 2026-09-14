import { EmailAddressUpdateOtpRequestForUserEmail } from '../../templates/EmailAddressUpdateOtpRequestForUserEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function EmailAddressUpdateOtpRequestForUserEmailDePreview() {
    return (
        <EmailAddressUpdateOtpRequestForUserEmail
            code={emailPreviewFixtures.otpCode}
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        />
    );
}
