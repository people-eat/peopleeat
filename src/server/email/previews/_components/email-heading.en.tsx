import { EmailHeading } from '../../components/EmailHeading';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailHeadingEnPreview() {
    return (
        <EmailComponentPreview locale="en">
            <EmailHeading>Your sign-in code</EmailHeading>
        </EmailComponentPreview>
    );
}
