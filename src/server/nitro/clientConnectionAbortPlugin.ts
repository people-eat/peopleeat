import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import https from 'node:https';

import { definePlugin } from 'nitro';

import { isClientConnectionAbortError } from '../utils/isClientConnectionAbortError';

const HTTP_SERVER_PATCHED = Symbol.for('peopleeat.httpServerClientAbortPatched');
const CONSOLE_FILTER_INSTALLED = Symbol.for('peopleeat.clientAbortConsoleFilter');

/**
 * Client disconnects (mobile hang-up, refresh, Traefik idle close) make Node
 * destroy the IncomingMessage with `Error: aborted` / `ECONNRESET`. Without a
 * listener that becomes Nitro's `[uncaughtException]` console noise. Treat it
 * as expected: attach silent stream handlers and filter residual console.error.
 */
export default definePlugin(() => {
    patchServerPrototype(http.Server);
    patchServerPrototype(https.Server);
    installClientAbortConsoleFilter();
});

function onRequestStreamError(error: Error): void {
    if (isClientConnectionAbortError(error)) {
        return;
    }
    console.error(error);
}

function attachClientAbortHandlers(req: IncomingMessage, res: ServerResponse): void {
    req.on('error', onRequestStreamError);
    res.on('error', onRequestStreamError);
}

function patchServerPrototype(Server: typeof http.Server): void {
    const proto = Server.prototype as typeof http.Server.prototype & {
        [HTTP_SERVER_PATCHED]?: true;
    };
    if (proto[HTTP_SERVER_PATCHED]) {
        return;
    }
    proto[HTTP_SERVER_PATCHED] = true;

    const originalEmit = proto.emit;
    proto.emit = function patchedEmit(this: http.Server, event: string | symbol, ...args: unknown[]): boolean {
        if (event === 'request' && args.length >= 2) {
            attachClientAbortHandlers(args[0] as IncomingMessage, args[1] as ServerResponse);
        }
        return originalEmit.apply(this, [event, ...args] as Parameters<typeof originalEmit>);
    };
}

function installClientAbortConsoleFilter(): void {
    const consoleWithFlag = console as typeof console & { [CONSOLE_FILTER_INSTALLED]?: true };
    if (consoleWithFlag[CONSOLE_FILTER_INSTALLED]) {
        return;
    }
    consoleWithFlag[CONSOLE_FILTER_INSTALLED] = true;

    const originalError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
        // Nitro's trapUnhandledErrors does `console.error('[uncaughtException]', error)`.
        if (args.some((arg) => isClientConnectionAbortError(arg))) {
            return;
        }
        originalError(...args);
    };
}
