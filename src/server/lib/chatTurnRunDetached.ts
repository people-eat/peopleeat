import type { ChatSurface } from '../domain/chatMessage';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChatAssistantOptions, GqlSSession } from '../graphql/generated';
import { chatTurnAgentCreate } from './chatTurnAgentCreate';
import { chatTurnRun } from './chatTurnRun';

/** Fire-and-forget turn execution after the create/continue mutation commits. */
export function chatTurnRunDetached({
    chatTurnId,
    surface,
    assistantOptions,
    requestingSession,
    serverRuntime,
}: {
    chatTurnId: string;
    surface: ChatSurface;
    assistantOptions: GqlSChatAssistantOptions;
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}): void {
    const turnFunction = chatTurnAgentCreate({
        serverRuntime,
        session: requestingSession,
        assistantOptions,
        surface,
    });
    void chatTurnRun(serverRuntime, chatTurnId, turnFunction).catch((error) => {
        serverRuntime.log.error(error);
    });
}
