import { EmailLayout } from '../../components/EmailLayout';
import { EmailText } from '../../components/EmailText';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function EmailLayoutDePreview() {
    return (
        <EmailLayout
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            preview="Vorschau der gemeinsamen E-Mail-Hülle"
            subject="Beispiel-Betreff"
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
        >
            <EmailText>Das ist der Körper der E-Mail. Hier steht der eigentliche Inhalt.</EmailText>
        </EmailLayout>
    );
}
