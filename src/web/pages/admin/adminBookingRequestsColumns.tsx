import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
import { formatBookingEventWhenFromCountry, formatBookingWhenJoined, formatDate, userDisplayName } from '../../../shared';
import { bookingRequestStatusHue, bookingRequestStatusLabel } from '../../../shared/bookingRequestStatus';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import type { GqlCBookingRequestPublicationStatus, GqlCBookingRequestStatus } from '../../graphql/generated';
import type { AdminBookingRequestsDataTableFeatures } from './adminBookingRequestsDataTableFeatures';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';

export type AdminBookingRequestsTableRow = {
    bookingRequestId: string;
    createdAt: string;
    dateTime: string;
    venueCountry?: string | null;
    venueCity?: string | null;
    occasion: string;
    status: GqlCBookingRequestStatus;
    publicationStatus: GqlCBookingRequestPublicationStatus;
    location: string;
    offerCount: number;
    customerName: string;
    customerEmail: string | null;
    cookName: string | null;
};

export const ADMIN_BOOKING_REQUESTS_SORT_FIELDS = ['createdAt', 'dateTime', 'occasion'] as const;
export type AdminBookingRequestsSortField = (typeof ADMIN_BOOKING_REQUESTS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminBookingRequestsDataTableFeatures, AdminBookingRequestsTableRow>();

export function adminBookingRequestPublicationStatusLabel(status: GqlCBookingRequestPublicationStatus, locale: Locale) {
    return t(locale, 'admin', `bookingRequests.publication.${status}`);
}

export function adminBookingRequestsColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.created')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
        columnHelper.accessor('dateTime', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.event')}</AdminDataTableSortHeader>,
            cell: ({ row }) => (
                <span className="text-sm tabular-nums">
                    {formatBookingWhenJoined(
                        formatBookingEventWhenFromCountry({
                            instant: row.original.dateTime,
                            locale,
                            viewerTimeZone: timeZone,
                            venueCountry: row.original.venueCountry,
                            venueCity: row.original.venueCity,
                        }),
                    )}
                </span>
            ),
        }),
        columnHelper.accessor('occasion', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.occasion')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.occasion}</span>,
        }),
        columnHelper.accessor('customerName', {
            id: 'customer',
            header: () => t(locale, 'admin', 'copy.customer'),
            cell: ({ row }) => (
                <div className="grid gap-0.5">
                    <span>{row.original.customerName}</span>
                    <span className="text-muted-foreground">{row.original.customerEmail ?? '—'}</span>
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('location', {
            header: () => t(locale, 'admin', 'copy.location2'),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.location}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('status', {
            header: () => t(locale, 'admin', 'copy.status'),
            cell: ({ row }) => (
                // `w-max`: Badge uses overflow-hidden, so as a grid item its min-width collapses to 0 and
                // long labels (e.g. "Zahlungsmittel hinterlegen") paint over Offers/Cook. Size to content.
                <div className="grid w-max gap-1">
                    <BookingStatusPill hue={bookingRequestStatusHue(row.original.status)}>
                        {bookingRequestStatusLabel(row.original.status, locale, 'admin')}
                    </BookingStatusPill>
                    {row.original.publicationStatus === 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' ? (
                        <Badge variant="outline">{adminBookingRequestPublicationStatusLabel(row.original.publicationStatus, locale)}</Badge>
                    ) : null}
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('offerCount', {
            header: () => t(locale, 'admin', 'copy.offers'),
            cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.offerCount}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('cookName', {
            header: () => t(locale, 'admin', 'copy.cook'),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.cookName ?? t(locale, 'admin', 'copy.empty')}</span>,
            enableSorting: false,
        }),
    ]);
}

export function adminBookingRequestCustomerLabel(customer: { firstName: string; lastName: string }): string {
    return userDisplayName(customer);
}
