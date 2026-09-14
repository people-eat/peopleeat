import { EmailText } from '../../components/EmailText';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailTextDePreview() {
    return (
        <EmailComponentPreview locale="de">
            <EmailText>Gib diesen Code auf der Anmeldeseite ein. Er ist zehn Minuten gültig.</EmailText>
        </EmailComponentPreview>
    );
}
