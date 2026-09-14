import { EmailQuestions } from '../../components/EmailQuestions';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailQuestionsDePreview() {
    return (
        <EmailComponentPreview locale="de">
            <EmailQuestions locale="de" />
        </EmailComponentPreview>
    );
}
