/**
 * Narrow a loaded user/email row to one with a sendable address.
 * Anonymized users have `emailAddress: null` — skip outbound mail.
 */
export function emailAddressPresent<T extends { emailAddress: string | null | undefined }>(
    row: T | null | undefined,
): (Omit<T, 'emailAddress'> & { emailAddress: string }) | null {
    if (row == null || row.emailAddress == null || row.emailAddress.length === 0) {
        return null;
    }
    return { ...row, emailAddress: row.emailAddress };
}
