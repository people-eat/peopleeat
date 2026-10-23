/**
 * True when the planned card-pull instant is already due (job becomes immediately eligible).
 */
export function bookingPaymentPullIsPast(plannedPaymentPullDateTime: Date | string | null | undefined, now: Date = new Date()): boolean {
    if (plannedPaymentPullDateTime == null) return false;
    return new Date(plannedPaymentPullDateTime).getTime() <= now.getTime();
}
