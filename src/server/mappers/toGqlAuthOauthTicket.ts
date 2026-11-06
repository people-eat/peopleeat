import type { AuthOauthTicket } from '../db/schema';
import type { GqlSAuthOauthTicket } from '../graphql/generated';

export function toGqlAuthOauthTicket(ticket: AuthOauthTicket): GqlSAuthOauthTicket {
    return {
        authOauthTicketId: ticket.authOauthTicketId,
        emailAddress: ticket.emailAddress,
        expiresAt: ticket.expiresAt,
        verifiedAt: ticket.verifiedAt,
        firstName: ticket.firstName ?? null,
        lastName: ticket.lastName ?? null,
        phoneNumber: ticket.phoneNumber ?? null,
        birthDate: ticket.birthDate ?? null,
    };
}
