import { EmailQuestions } from '../../components/EmailQuestions';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailQuestionsEnPreview() {
    return (
        <EmailComponentPreview locale="en">
            <EmailQuestions locale="en" />
        </EmailComponentPreview>
    );
}
