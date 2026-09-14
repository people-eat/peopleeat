/**
 * Coerce a GraphQL `Date` scalar value to `YYYY-MM-DD`.
 *
 * `graphql-scalars`' `DateResolver` parses wire strings into JS `Date` objects
 * even though codegen types them as `string`. `String(date).slice(0, 10)` yields
 * locale junk like `"Wed Sep 16"` — always normalize via UTC ISO.
 */
export function graphqlDateToIsoDate(value: string | Date): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    const trimmed = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('graphqlDateToIsoDate: date is invalid');
    }
    return parsed.toISOString().slice(0, 10);
}
