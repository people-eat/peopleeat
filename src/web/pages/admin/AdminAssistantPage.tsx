import { AssistantChatWorkspace } from '../../components/AssistantChatWorkspace';
import { useAdminNavSidebar } from './AdminLayout';

export const adminAssistantPageTitle = { de: 'Assistent', en: 'Assistant' } as const;
export const adminAssistantPageDescription = {
    de: 'Vollbild-Assistent für Admin-Aufgaben.',
    en: 'Full-screen assistant for admin work.',
} as const;

export function AdminAssistantPage({ chatId }: { chatId?: string }) {
    const { toggleSidebar } = useAdminNavSidebar();
    return <AssistantChatWorkspace surface="admin" chatId={chatId} onToggleNav={toggleSidebar} />;
}
