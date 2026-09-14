import { EmailSignOff } from '../../components/EmailSignOff';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailSignOffEnPreview() {
    return (
        <EmailComponentPreview locale="en">
            <EmailSignOff locale="en" />
        </EmailComponentPreview>
    );
}
