import type { ComponentProps } from 'react';

import { assistantSidebarLabels } from '../chat/assistantSidebarCopy';
import { AssistantSidebarShell } from './AssistantSidebarShell';

export const profileAssistantTitle = assistantSidebarLabels.defaultTitle;

type ProfileAssistantSurface = 'cook' | 'customer';
type ProfileAssistantSidebarProps = Omit<ComponentProps<typeof AssistantSidebarShell>, 'surface'> & {
    surface: ProfileAssistantSurface;
};

/**
 * Profile assistant rail. Cook and customer share the compose/list spine;
 * customer tools remain scaffolded server-side.
 */
export function ProfileAssistantSidebar({ surface, ...props }: ProfileAssistantSidebarProps) {
    return <AssistantSidebarShell key={surface} surface={surface} {...props} />;
}
