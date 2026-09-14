import { EmailHeading } from '../../components/EmailHeading';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailHeadingDePreview() {
    return (
        <EmailComponentPreview locale="de">
            <EmailHeading>Dein Anmeldecode</EmailHeading>
        </EmailComponentPreview>
    );
}
