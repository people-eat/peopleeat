import { describe, expect, it } from 'vitest';

import { sessionDeviceLabel } from '../../shared/sessionDeviceLabel';

describe('sessionDeviceLabel (web re-export)', () => {
    it('still resolves through the shared helper', () => {
        expect(sessionDeviceLabel(null, 'en')).toBe('Unknown device');
    });
});
