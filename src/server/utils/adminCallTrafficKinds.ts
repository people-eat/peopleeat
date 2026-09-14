import type { GqlSAdminCallListItemKind, GqlSCookCallSlotBookingStatus } from '../graphql/generated';

const ADMIN_CALL_TRAFFIC_ALL_KINDS: GqlSAdminCallListItemKind[] = [
    'LIVE',
    'PENDING',
    'UPCOMING',
    'RECENT_ROOM',
    'RECENT_SLOT',
    'DECLINED',
    'CANCELED',
];

const ROOM_KINDS: ReadonlySet<GqlSAdminCallListItemKind> = new Set(['LIVE', 'RECENT_ROOM']);
const SLOT_KINDS: ReadonlySet<GqlSAdminCallListItemKind> = new Set(['PENDING', 'UPCOMING', 'RECENT_SLOT', 'DECLINED', 'CANCELED']);

export function adminCallTrafficKindsResolve(kinds: readonly GqlSAdminCallListItemKind[] | null | undefined): GqlSAdminCallListItemKind[] {
    if (kinds == null || kinds.length === 0) {
        return ADMIN_CALL_TRAFFIC_ALL_KINDS;
    }
    return [...new Set(kinds)];
}

export function adminCallTrafficIncludesRooms(kinds: readonly GqlSAdminCallListItemKind[]): boolean {
    return kinds.some((kind) => ROOM_KINDS.has(kind));
}

export function adminCallTrafficIncludesSlots(kinds: readonly GqlSAdminCallListItemKind[]): boolean {
    return kinds.some((kind) => SLOT_KINDS.has(kind));
}

export function adminCallTrafficRoomStatuses(kinds: readonly GqlSAdminCallListItemKind[]): Array<'ACTIVE' | 'ENDED'> {
    const statuses: Array<'ACTIVE' | 'ENDED'> = [];
    if (kinds.includes('LIVE')) statuses.push('ACTIVE');
    if (kinds.includes('RECENT_ROOM')) statuses.push('ENDED');
    return statuses;
}

export function adminCallTrafficSlotStatuses(kinds: readonly GqlSAdminCallListItemKind[]): GqlSCookCallSlotBookingStatus[] {
    const statuses: GqlSCookCallSlotBookingStatus[] = [];
    if (kinds.includes('PENDING')) statuses.push('PENDING');
    if (kinds.includes('UPCOMING')) statuses.push('CONFIRMED');
    if (kinds.includes('RECENT_SLOT')) statuses.push('COMPLETED');
    if (kinds.includes('DECLINED')) statuses.push('DECLINED');
    if (kinds.includes('CANCELED')) statuses.push('CANCELED');
    return statuses;
}

export function adminCallTrafficKindFromSlotStatus(status: GqlSCookCallSlotBookingStatus): GqlSAdminCallListItemKind {
    switch (status) {
        case 'PENDING':
            return 'PENDING';
        case 'CONFIRMED':
            return 'UPCOMING';
        case 'COMPLETED':
            return 'RECENT_SLOT';
        case 'DECLINED':
            return 'DECLINED';
        case 'CANCELED':
            return 'CANCELED';
    }
}

export function adminCallTrafficKindFromRoomStatus(status: 'ACTIVE' | 'ENDED'): GqlSAdminCallListItemKind {
    return status === 'ACTIVE' ? 'LIVE' : 'RECENT_ROOM';
}
