export type CookSidebarNavBadgeCounts = {
    poolReviewCount: number;
    offersUnreadCount: number;
    walletBadge: boolean;
};

export function cookSidebarNavBadgeCountsFromCook(cook: {
    isApprovedByAdmin: boolean;
    stripeStatus: string;
    openBookingRequests: readonly unknown[];
    bookingRequestOffers: readonly { cookUnreadNotificationCount: number }[];
}): CookSidebarNavBadgeCounts {
    return {
        poolReviewCount: cook.openBookingRequests.length,
        offersUnreadCount: cook.bookingRequestOffers.reduce((sum, offer) => sum + offer.cookUnreadNotificationCount, 0),
        walletBadge: cook.isApprovedByAdmin && cook.stripeStatus !== 'COMPLETED',
    };
}
