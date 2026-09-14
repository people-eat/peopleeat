import { tool } from 'ai';
import { z } from 'zod';

// --- toolWriteToConsole ------------------------------------------------------
//
// Prints a message to the server console. Wired into audience agents that
// expose approval-gated tools. Approval gating is configured at the agent
// level via `toolApproval` — see `docs/architecture/chat.md` ("Tool approvals").
//
// The whole approval lifecycle is SDK-driven. On approve, the SDK re-enters
// the agent loop, runs `execute` itself, and feeds the result to the model.
// We do not call `execute` from the respond command.
//
// Reused across agents — keep agent-specific behavior out of here.

export function toolWriteToConsole() {
    return tool({
        description: [
            'Print a message to the server console.',
            'Call this whenever the user explicitly asks you to log, print, or write something to the console.',
        ].join(' '),
        inputSchema: z.object({
            message: z.string().describe('Exact text to print.'),
        }),
        execute({ message }) {
            console.log(message);
            return { ok: true, message };
        },
    });
}
