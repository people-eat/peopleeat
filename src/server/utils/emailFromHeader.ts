import { SITE_NAME } from '../../shared/siteBranding';

/** `peopleeat <addr>` for Resend; pass through if `RESEND_FROM_EMAIL` already has a display name. */
export function emailFromHeader(fromEmail: string): string {
    if (fromEmail.includes('<')) {
        return fromEmail;
    }
    return `${SITE_NAME} <${fromEmail}>`;
}
