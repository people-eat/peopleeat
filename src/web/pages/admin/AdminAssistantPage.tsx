import { t } from '../../../i18n/t';
import { AssistantChatWorkspace } from '../../components/AssistantChatWorkspace';
import type { Locale } from '../../utils/locale';
import { useAdminNavSidebar } from './AdminLayout';

export function adminAssistantPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.assistant.title');
}
export function adminAssistantPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.assistant.description');
}

export function AdminAssistantPage({ chatId }: { chatId?: string }) {
    const { toggleSidebar } = useAdminNavSidebar();
    return <AssistantChatWorkspace surface="admin" chatId={chatId} onToggleNav={toggleSidebar} />;
}
