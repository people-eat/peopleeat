/**
 * Request expiry = end of the event calendar day (UTC). Matches the product
 * rule “expires at end of event day” without a per-user time zone column yet.
 */
export function bookingRequestExpiresAt(dateTime: Date): Date {
    const expiresAt = new Date(dateTime);
    expiresAt.setUTCHours(23, 59, 59, 999);
    return expiresAt;
}
