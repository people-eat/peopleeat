export type GraphqlOperationType = 'query' | 'mutation' | 'subscription' | 'unknown';

export type GraphqlErrorClass = 'none' | 'unauthorized' | 'not_found' | 'graphql_error';

/** Strip leading whitespace and `#` / `"""` comments so the operation keyword is visible. */
function documentLeadingBody(document: string): string {
    let remaining = document;
    for (;;) {
        const trimmed = remaining.replace(/^\s+/, '');
        if (trimmed.startsWith('#')) {
            const newline = trimmed.indexOf('\n');
            remaining = newline === -1 ? '' : trimmed.slice(newline + 1);
            continue;
        }
        if (trimmed.startsWith('"""')) {
            const end = trimmed.indexOf('"""', 3);
            remaining = end === -1 ? '' : trimmed.slice(end + 3);
            continue;
        }
        if (trimmed.startsWith('"') && !trimmed.startsWith('"""')) {
            const end = trimmed.indexOf('"', 1);
            remaining = end === -1 ? '' : trimmed.slice(end + 1);
            continue;
        }
        return trimmed;
    }
}

export function graphqlOperationType(document: string): GraphqlOperationType {
    const body = documentLeadingBody(document);
    const match = body.match(/^(query|mutation|subscription)\b/);
    if (!match?.[1]) {
        // Shorthand query: `{ field }` with no operation keyword.
        if (body.startsWith('{')) {
            return 'query';
        }
        return 'unknown';
    }
    return match[1] as GraphqlOperationType;
}

export function graphqlOperationNameResolve(input: { document: string; clientOperationName?: string | null }): string {
    const clientName = input.clientOperationName?.trim();
    if (clientName) {
        return clientName;
    }
    const match = input.document.match(/\b(?:query|mutation|subscription)\s+([A-Za-z_][\w]*)/);
    return match?.[1] ?? 'anonymous';
}

type GraphqlErrorLike = { message?: string | null } | null | undefined;

export function graphqlErrorClass(errors: ReadonlyArray<GraphqlErrorLike> | null | undefined): GraphqlErrorClass {
    if (!errors?.length) {
        return 'none';
    }
    for (const error of errors) {
        const message = error?.message ?? '';
        if (message === 'Unauthorized') {
            return 'unauthorized';
        }
        if (/not found/i.test(message)) {
            return 'not_found';
        }
    }
    return 'graphql_error';
}
