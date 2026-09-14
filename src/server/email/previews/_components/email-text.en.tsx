import { EmailText } from '../../components/EmailText';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailTextEnPreview() {
    return (
        <EmailComponentPreview locale="en">
            <EmailText>Enter this code on the sign-in page. It expires in ten minutes.</EmailText>
        </EmailComponentPreview>
    );
}
