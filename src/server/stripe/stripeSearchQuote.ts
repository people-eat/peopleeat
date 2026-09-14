// Stripe Search query language wraps string values in single quotes. Escape
// backslashes and quotes so metadata / email values cannot break out of the
// query string.
export function stripeSearchQuote(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
