export type CustomerSidebarNavBadgeCounts = {
    supportUnreadCount: number;
};

export function customerSidebarNavBadgeCountsFromUser(user: {
    supportRequests: readonly { userUnreadNotificationCount: number }[] | null | undefined;
}): CustomerSidebarNavBadgeCounts {
    const supportRequests = user.supportRequests ?? [];
    return {
        supportUnreadCount: supportRequests.reduce((sum, request) => sum + request.userUnreadNotificationCount, 0),
    };
}
