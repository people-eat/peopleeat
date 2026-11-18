import type { FileUploadMetadata } from '../db/fileUploadMetadata';
import type { AuthOauthTicket } from '../db/schema';
import type { GqlSAuthOauthTicket } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

export function toGqlAuthOauthTicket(ticket: AuthOauthTicket, profilePicture: FileUploadMetadata | null = null): GqlSAuthOauthTicket {
    return {
        authOauthTicketId: ticket.authOauthTicketId,
        emailAddress: ticket.emailAddress,
        expiresAt: ticket.expiresAt,
        verifiedAt: ticket.verifiedAt,
        firstName: ticket.firstName ?? null,
        lastName: ticket.lastName ?? null,
        phoneNumber: ticket.phoneNumber ?? null,
        birthDate: ticket.birthDate ?? null,
        profilePicture: profilePicture ? toGqlFileUpload(profilePicture) : null,
    };
}
