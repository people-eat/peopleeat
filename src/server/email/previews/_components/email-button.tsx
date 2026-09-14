import { EmailButton } from '../../components/EmailButton';
import { EmailComponentPreview } from '../emailPreviewUtils';

export default function EmailButtonPreview() {
    return (
        <EmailComponentPreview locale="de">
            <EmailButton href="https://peopleeat.com">Zum Angebot</EmailButton>
        </EmailComponentPreview>
    );
}
