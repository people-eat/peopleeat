import { EmailSignOff } from '../../components/EmailSignOff';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailSignOffDePreview() {
    return (
        <EmailComponentPreview locale="de">
            <EmailSignOff locale="de" />
        </EmailComponentPreview>
    );
}
