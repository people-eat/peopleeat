import type { ComponentProps } from 'react';

import { assistantSidebarLabels } from '../chat/assistantSidebarCopy';
import { AssistantSidebarShell } from './AssistantSidebarShell';

export const adminAssistantTitle = assistantSidebarLabels.defaultTitle;

type AdminAssistantSidebarProps = Omit<ComponentProps<typeof AssistantSidebarShell>, 'surface'>;

export function AdminAssistantSidebar(props: AdminAssistantSidebarProps) {
    return <AssistantSidebarShell surface="admin" {...props} />;
}
