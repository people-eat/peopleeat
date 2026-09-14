import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminQueuedJobCancel } from './adminQueuedJobCancel';

describe('adminQueuedJobCancel', () => {
    it('cancels a pending queued job and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'job-cancel-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const jobId = idCreate();
        const name = 'gift-card-prepared-expire';
        vi.mocked(admin.serverRuntime.jobs.findById).mockResolvedValueOnce([{ id: jobId } as never]);

        // Act
        const result = await adminQueuedJobCancel(
            adminMutationParent(admin.user.userId),
            { jobId, name },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: jobId });
        expect(admin.serverRuntime.jobs.cancel).toHaveBeenCalledWith(name, jobId);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('throws when the queue name is not a known queued definition', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'job-cancel-unknown', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminQueuedJobCancel(
                adminMutationParent(admin.user.userId),
                { jobId: idCreate(), name: 'not-a-real-queue' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/unknown job queue/);

        expect(admin.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('throws when the job is missing, logs the error, and does not cancel', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'job-cancel-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const jobId = idCreate();
        vi.mocked(admin.serverRuntime.jobs.findById).mockResolvedValueOnce([]);

        // Act + Assert
        await expect(
            adminQueuedJobCancel(
                adminMutationParent(admin.user.userId),
                { jobId, name: 'gift-card-prepared-expire' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/job not found or already finished/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/job not found or already finished/);
    });
});
