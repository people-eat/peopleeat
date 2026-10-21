import { ilike, or, sql } from 'drizzle-orm';
import type { AnyColumn, SQL } from 'drizzle-orm';

/**
 * Case-insensitive contains match on first name, last name, and full name in
 * either order (`First Last` / `Last First`). `pattern` must already be a
 * LIKE contains pattern (e.g. from `likeContainsPattern`).
 */
export function userNameIlikeMatch(name: { firstName: AnyColumn; lastName: AnyColumn }, pattern: string): SQL {
    return or(
        ilike(name.firstName, pattern),
        ilike(name.lastName, pattern),
        ilike(sql`(${name.firstName} || ' ' || ${name.lastName})`, pattern),
        ilike(sql`(${name.lastName} || ' ' || ${name.firstName})`, pattern),
    )!;
}
