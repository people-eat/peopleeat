/**
 * True when `error` is the expected fallout of a client closing the socket
 * mid-request (mobile backgrounding, browser refresh, proxy idle timeout, …).
 *
 * Node's HTTP server surfaces this as `Error: aborted` with `code: 'ECONNRESET'`
 * from `abortIncoming` — not an application failure.
 */
export function isClientConnectionAbortError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    if (isClientConnectionAbortShape(error)) {
        return true;
    }

    const cause = (error as { cause?: unknown }).cause;
    return cause !== undefined && isClientConnectionAbortError(cause);
}

type ClientConnectionAbortShape = {
    code?: unknown;
    message?: unknown;
    name?: unknown;
};

function isClientConnectionAbortShape(error: ClientConnectionAbortShape): boolean {
    const code = typeof error.code === 'string' ? error.code : undefined;
    const message = typeof error.message === 'string' ? error.message : undefined;
    const name = typeof error.name === 'string' ? error.name : undefined;

    if (name === 'AbortError') {
        return true;
    }

    // Node `ConnResetException` from `abortIncoming` / `socketOnClose`.
    if (code === 'ECONNRESET' && message === 'aborted') {
        return true;
    }

    // Response write after the client already hung up.
    if (code === 'EPIPE' || code === 'ERR_STREAM_PREMATURE_CLOSE') {
        return true;
    }

    // srvx / Fetch abort wording when the peer is gone.
    if (message === 'The operation was aborted.' || message === 'The request was aborted.') {
        return true;
    }

    return false;
}
