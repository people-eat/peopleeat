import { describe, expect, it } from 'vitest';

import { graphqlErrorClass, graphqlOperationNameResolve, graphqlOperationType } from './graphqlOperationMeta';

describe('graphqlOperationType', () => {
    it('detects query, mutation, and subscription', () => {
        expect(graphqlOperationType('query HomePage { currentSession { sessionId } }')).toBe('query');
        expect(graphqlOperationType('mutation ProfileMealUpdate { mealUpdate { mealId } }')).toBe('mutation');
        expect(graphqlOperationType('subscription ChatUpdates { chatUpdates { chatId } }')).toBe('subscription');
    });

    it('treats shorthand selection sets as query', () => {
        expect(graphqlOperationType('{ currentSession { sessionId } }')).toBe('query');
    });

    it('skips leading comments and whitespace', () => {
        expect(graphqlOperationType('  # comment\nmutation Foo { x }')).toBe('mutation');
    });

    it('returns unknown for empty documents', () => {
        expect(graphqlOperationType('')).toBe('unknown');
    });
});

describe('graphqlOperationNameResolve', () => {
    it('prefers the client operation name', () => {
        expect(
            graphqlOperationNameResolve({
                document: 'query DocumentName { x }',
                clientOperationName: 'ClientName',
            }),
        ).toBe('ClientName');
    });

    it('falls back to the document name', () => {
        expect(graphqlOperationNameResolve({ document: 'mutation ProfileMealUpdate { x }' })).toBe('ProfileMealUpdate');
    });

    it('returns anonymous when unnamed', () => {
        expect(graphqlOperationNameResolve({ document: '{ x }' })).toBe('anonymous');
        expect(graphqlOperationNameResolve({ document: 'query { x }', clientOperationName: '  ' })).toBe('anonymous');
    });
});

describe('graphqlErrorClass', () => {
    it('returns none when there are no errors', () => {
        expect(graphqlErrorClass(undefined)).toBe('none');
        expect(graphqlErrorClass([])).toBe('none');
    });

    it('classifies Unauthorized and not found', () => {
        expect(graphqlErrorClass([{ message: 'Unauthorized' }])).toBe('unauthorized');
        expect(graphqlErrorClass([{ message: 'Booking request not found' }])).toBe('not_found');
    });

    it('falls back to graphql_error', () => {
        expect(graphqlErrorClass([{ message: 'Something broke' }])).toBe('graphql_error');
    });
});
