import { AssistantChatWorkspace } from '../../components/AssistantChatWorkspace';
import { useProfileNavSidebar } from './ProfileAssistantPane';

export const profileAssistantPageTitle = { de: 'Assistent', en: 'Assistant' } as const;
export const profileAssistantPageDescription = {
    de: 'Vollbild-Assistent für dein Profil.',
    en: 'Full-screen assistant for your profile.',
} as const;

export function ProfileAssistantPage({ surface, chatId }: { surface: 'cook' | 'customer'; chatId?: string }) {
    const { toggleSidebar } = useProfileNavSidebar();
    return <AssistantChatWorkspace surface={surface} chatId={chatId} onToggleNav={toggleSidebar} />;
}
