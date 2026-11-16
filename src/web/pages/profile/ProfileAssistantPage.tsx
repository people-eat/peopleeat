import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';
import { AssistantChatWorkspace } from '../../components/AssistantChatWorkspace';
import { useProfileNavSidebar } from './ProfileAssistantPane';

export function profileAssistantPageTitle(locale: Locale): string {
    return t(locale, 'profile', 'assistant.title');
}
export function profileAssistantPageDescription(locale: Locale): string {
    return t(locale, 'profile', 'assistant.description');
}

export function ProfileAssistantPage({ surface, chatId }: { surface: 'cook' | 'customer'; chatId?: string }) {
    const { toggleSidebar } = useProfileNavSidebar();
    return <AssistantChatWorkspace surface={surface} chatId={chatId} onToggleNav={toggleSidebar} />;
}
