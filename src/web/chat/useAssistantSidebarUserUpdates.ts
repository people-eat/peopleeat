import { useEffect } from 'react';
import { useClient } from 'urql';

import { AssistantSidebarUserUpdatesPingDocument } from '../graphql/generated';

/** Refetch title/list when any owner-scoped write publishes `userUpdates`. */
export function useAssistantSidebarUserUpdates(onUpdate: () => void): void {
    const client = useClient();

    useEffect(() => {
        const { unsubscribe } = client.subscription(AssistantSidebarUserUpdatesPingDocument, {}).subscribe((result) => {
            if (result.data?.userUpdates) onUpdate();
        });
        return () => unsubscribe();
    }, [client, onUpdate]);
}
