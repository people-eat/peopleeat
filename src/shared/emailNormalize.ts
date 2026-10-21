/** Trim and lowercase for persist / uniqueness checks. */
export function emailNormalize(email: string): string {
    return email.trim().toLowerCase();
}
