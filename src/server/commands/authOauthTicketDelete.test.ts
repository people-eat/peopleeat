import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authOauthTickets, fileUploads } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { authOauthTicketDelete } from './authOauthTicketDelete';
import { fileUploadCreate } from './fileUploadCreate';

describe('authOauthTicketDelete', () => {
    it('deletes the pending OAuth photo with the ticket', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const upload = await fileUploadCreate(testDb, {
            userId: null,
            filename: 'avatar.webp',
            mediaType: 'image/webp',
            bytes: Buffer.from('RIFF'),
        });
        const authOauthTicketId = idCreate();
        await testDb.insert(authOauthTickets).values({
            authOauthTicketId,
            sessionId: requestingSession.sessionId,
            provider: 'GOOGLE',
            subject: `sub-${idCreate()}`,
            emailAddress: `ticket-delete-${idCreate().toLowerCase()}@example.com`,
            firstName: 'Ada',
            lastName: 'Lovelace',
            profilePictureFileUploadId: upload.fileUploadId,
            verifiedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

        const result = await authOauthTicketDelete({ authOauthTicketId }, requestingSession, serverRuntime);
        expect(result.success).toBe(true);

        const tickets = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.authOauthTicketId, authOauthTicketId));
        expect(tickets).toHaveLength(0);
        const files = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, upload.fileUploadId));
        expect(files).toHaveLength(0);
    });
});
