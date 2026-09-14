import { describe, expect, it } from 'vitest';

import { emailFromHeader } from './emailFromHeader';

describe('emailFromHeader', () => {
    it('prefixes SITE_NAME when given a bare address', () => {
        expect(emailFromHeader('peopleeat@mail.people-eat.com')).toBe('peopleeat <peopleeat@mail.people-eat.com>');
    });

    it('leaves an already-formatted From value unchanged', () => {
        expect(emailFromHeader('Custom <ops@example.com>')).toBe('Custom <ops@example.com>');
    });
});
