import { eq, inArray } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { Database, DatabaseTransaction } from '../db';
import type { AuthOauthTicketCreate } from '../db/schema';
import { authOauthTickets, fileUploads } from '../db/schema';
import type { AuthOauthProfilePictureBytes } from './authOauthProfilePictureImport';

type Db = Database | DatabaseTransaction;

export async function authOauthTicketReplace(
    db: Db,
    args: {
        ticket: Omit<AuthOauthTicketCreate, 'authOauthTicketId' | 'createdAt' | 'profilePictureFileUploadId'>;
        profilePicture: AuthOauthProfilePictureBytes | null;
    },
): Promise<void> {
    await authOauthTicketsDeleteForSession(db, args.ticket.sessionId);

    let profilePictureFileUploadId: string | null = null;
    if (args.profilePicture) {
        profilePictureFileUploadId = idCreate();
        await db.insert(fileUploads).values({
            fileUploadId: profilePictureFileUploadId,
            userId: null,
            filename: args.profilePicture.filename,
            mediaType: args.profilePicture.mediaType,
            size: args.profilePicture.bytes.byteLength,
            bytes: args.profilePicture.bytes,
        });
    }

    await db.insert(authOauthTickets).values({
        ...args.ticket,
        authOauthTicketId: idCreate(),
        profilePictureFileUploadId,
    });
}

export async function authOauthTicketsDeleteForSession(db: Db, sessionId: string): Promise<void> {
    const previous = await db
        .select({ profilePictureFileUploadId: authOauthTickets.profilePictureFileUploadId })
        .from(authOauthTickets)
        .where(eq(authOauthTickets.sessionId, sessionId));
    const pictureIds = previous
        .map((row) => row.profilePictureFileUploadId)
        .filter((fileUploadId): fileUploadId is string => fileUploadId != null);

    await db.delete(authOauthTickets).where(eq(authOauthTickets.sessionId, sessionId));
    if (pictureIds.length > 0) {
        await db.delete(fileUploads).where(inArray(fileUploads.fileUploadId, pictureIds));
    }
}

export async function authOauthTicketRowDelete(db: Db, authOauthTicketId: string): Promise<void> {
    const [row] = await db
        .select({ profilePictureFileUploadId: authOauthTickets.profilePictureFileUploadId })
        .from(authOauthTickets)
        .where(eq(authOauthTickets.authOauthTicketId, authOauthTicketId))
        .limit(1);
    await db.delete(authOauthTickets).where(eq(authOauthTickets.authOauthTicketId, authOauthTicketId));
    if (row?.profilePictureFileUploadId) {
        await db.delete(fileUploads).where(eq(fileUploads.fileUploadId, row.profilePictureFileUploadId));
    }
}
