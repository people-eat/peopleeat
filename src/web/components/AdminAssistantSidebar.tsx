import type { ComponentProps } from 'react';

import { AssistantSidebarShell } from './AssistantSidebarShell';

type AdminAssistantSidebarProps = Omit<ComponentProps<typeof AssistantSidebarShell>, 'surface'>;

export function AdminAssistantSidebar(props: AdminAssistantSidebarProps) {
    return <AssistantSidebarShell surface="admin" {...props} />;
}
