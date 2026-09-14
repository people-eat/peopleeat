function webPageBase(webPageUrl: string): string {
    return webPageUrl.replace(/\/$/, '');
}

export function supportRequestEmailCustomerUrl(webPageUrl: string, supportRequestId: string): string {
    return `${webPageBase(webPageUrl)}/profile/support-requests/${supportRequestId}`;
}
