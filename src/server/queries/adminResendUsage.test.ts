import { describe, expect, it, vi } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { adminResendUsage } from './adminResendUsage';

describe('adminResendUsage', () => {
    it('returns the usage payload from email.usageGet', async () => {
        // Arrange
        const setup = await commandSetup();
        const usage = {
            monthly: { used: 10, limit: 100, sent: 8, received: 2, resetsAt: new Date('2030-02-01T00:00:00.000Z') },
            daily: { used: 1, limit: null, sent: 1, received: 0, resetsAt: new Date('2030-01-02T00:00:00.000Z') },
        };
        vi.mocked(setup.serverRuntime.email.usageGet).mockResolvedValue(usage);

        // Act
        const result = await adminResendUsage({}, setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(result).toEqual(usage);
    });

    it('returns null when usage is unavailable', async () => {
        // Arrange
        const setup = await commandSetup();
        vi.mocked(setup.serverRuntime.email.usageGet).mockResolvedValue(null);

        // Act
        const result = await adminResendUsage({}, setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null when the usage call fails', async () => {
        // Arrange
        const setup = await commandSetup();
        vi.mocked(setup.serverRuntime.email.usageGet).mockRejectedValue(new Error('resend down'));

        // Act
        const result = await adminResendUsage({}, setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(result).toBeNull();
    });
});
