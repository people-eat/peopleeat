import type { UserStatus } from '../domain/user';

export type AdminMapCookStatus = 'LISTABLE' | 'PENDING' | 'HIDDEN';

/** Map pin color bucket — not the same as public listing (no published-meal gate). */
export function adminMapCookStatusDerive(
    cook: { isVisible: boolean; isApprovedByAdmin: boolean },
    userStatus: UserStatus,
): AdminMapCookStatus {
    if (userStatus !== 'ACTIVE') {
        return 'HIDDEN';
    }
    if (!cook.isApprovedByAdmin) {
        return 'PENDING';
    }
    if (!cook.isVisible) {
        return 'HIDDEN';
    }
    return 'LISTABLE';
}
