import { describe, expect, it } from 'vitest';

import {
    adminCallTrafficIncludesRooms,
    adminCallTrafficIncludesSlots,
    adminCallTrafficKindFromRoomStatus,
    adminCallTrafficKindFromSlotStatus,
    adminCallTrafficKindsResolve,
    adminCallTrafficRoomStatuses,
    adminCallTrafficSlotStatuses,
} from './adminCallTrafficKinds';

describe('adminCallTrafficKinds', () => {
    it('resolves empty kinds to all kinds', () => {
        expect(adminCallTrafficKindsResolve([])).toHaveLength(7);
        expect(adminCallTrafficKindsResolve(undefined)).toHaveLength(7);
    });

    it('maps slot and room statuses to kinds', () => {
        expect(adminCallTrafficKindFromSlotStatus('DECLINED')).toBe('DECLINED');
        expect(adminCallTrafficKindFromSlotStatus('CANCELED')).toBe('CANCELED');
        expect(adminCallTrafficKindFromSlotStatus('CONFIRMED')).toBe('UPCOMING');
        expect(adminCallTrafficKindFromRoomStatus('ACTIVE')).toBe('LIVE');
        expect(adminCallTrafficKindFromRoomStatus('ENDED')).toBe('RECENT_ROOM');
    });

    it('derives include flags and status lists from kinds', () => {
        const declinedOnly = adminCallTrafficKindsResolve(['DECLINED']);
        expect(adminCallTrafficIncludesRooms(declinedOnly)).toBe(false);
        expect(adminCallTrafficIncludesSlots(declinedOnly)).toBe(true);
        expect(adminCallTrafficSlotStatuses(declinedOnly)).toEqual(['DECLINED']);
        expect(adminCallTrafficRoomStatuses(declinedOnly)).toEqual([]);

        const liveOnly = adminCallTrafficKindsResolve(['LIVE']);
        expect(adminCallTrafficIncludesRooms(liveOnly)).toBe(true);
        expect(adminCallTrafficRoomStatuses(liveOnly)).toEqual(['ACTIVE']);
    });
});
