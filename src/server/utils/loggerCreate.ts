import { idCreate } from '../../shared/idCreate';
import type { Database } from '../db';
import { logs } from '../db/schema';
import { activeTraceContext } from '../observability/traceContext';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

type LogInput = unknown;
type LogSession = { sessionId: string } | null | undefined;

export interface Logger {
    error: (input: LogInput, session?: LogSession) => void;
    warn: (input: LogInput, session?: LogSession) => void;
    info: (input: LogInput, session?: LogSession) => void;
    debug: (input: LogInput, session?: LogSession) => void;
    drain: () => Promise<void>;
}

function normalize(input: LogInput): { message: string; context: Record<string, unknown> | undefined } {
    if (input instanceof Error) {
        return { message: input.message, context: { name: input.name, stack: input.stack } };
    }
    return { message: String(input), context: undefined };
}

function contextWithTrace(context: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    const trace = activeTraceContext();
    if (!trace) {
        return context;
    }
    return { ...context, ...trace };
}

export function loggerCreate(db: Database): Logger {
    const pending: Promise<unknown>[] = [];

    function logPersist(level: LogLevel, message: string, sessionId?: string, context?: Record<string, unknown>) {
        const promise = db.insert(logs).values({ logId: idCreate(), level, message, sessionId, context }).catch(console.error);
        pending.push(promise);
    }

    function log(level: LogLevel, input: LogInput, session?: LogSession) {
        const { message, context } = normalize(input);
        const merged = contextWithTrace(context);
        merged ? console[level](message, merged) : console[level](message);
        logPersist(level, message, session?.sessionId, merged);
    }

    return {
        error: (input, session) => log('error', input, session),
        warn: (input, session) => log('warn', input, session),
        info: (input, session) => log('info', input, session),
        debug: (input, session) => log('debug', input, session),
        async drain() {
            await Promise.allSettled(pending);
            pending.length = 0;
        },
    };
}
