import { createColumnHelper } from '@tanstack/react-table';

import { formatDate, formatDateTime, userDisplayName } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import { adminBookingRequestStatusLabel, bookingRequestStatusClassName } from '../../components/bookingRequestStatus';
import { BookingStatusPill } from '../../components/BookingStatusPill';
import type { GqlCBookingRequestPublicationStatus, GqlCBookingRequestStatus } from '../../graphql/generated';
import type { AdminBookingRequestsDataTableFeatures } from './adminBookingRequestsDataTableFeatures';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';

export type AdminBookingRequestsTableRow = {
    bookingRequestId: string;
    createdAt: string;
    dateTime: string;
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
    return {
        PUBLICATION_BLOCKED_BY_ADMIN_REVIEW: { de: 'Admin-Prüfung', en: 'Admin review' },
        PUBLICATION_AUTO_APPROVED: { de: 'Auto-freigegeben', en: 'Auto-approved' },
        PUBLICATION_APPROVED_BY_ADMIN: { de: 'Admin-freigegeben', en: 'Admin-approved' },
    }[status][locale];
}

export function adminBookingRequestsColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Erstellt', en: 'Created' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
        columnHelper.accessor('dateTime', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Termin', en: 'Event' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-sm tabular-nums">
                    {formatDateTime(row.original.dateTime, { locale, timeZone, dateStyle: 'full' })}
                </span>
            ),
        }),
        columnHelper.accessor('occasion', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Anlass', en: 'Occasion' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.occasion}</span>,
        }),
        columnHelper.accessor('customerName', {
            id: 'customer',
            header: () => ({ de: 'Kunde', en: 'Customer' })[locale],
            cell: ({ row }) => (
                <div className="grid gap-0.5">
                    <span>{row.original.customerName}</span>
                    <span className="text-muted-foreground">{row.original.customerEmail ?? '—'}</span>
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('location', {
            header: () => ({ de: 'Ort', en: 'Location' })[locale],
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.location}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('status', {
            header: () => ({ de: 'Status', en: 'Status' })[locale],
            cell: ({ row }) => (
                // `w-max`: Badge uses overflow-hidden, so as a grid item its min-width collapses to 0 and
                // long labels (e.g. "Zahlungsmittel hinterlegen") paint over Offers/Cook. Size to content.
                <div className="grid w-max gap-1">
                    <BookingStatusPill className={bookingRequestStatusClassName(row.original.status)}>
                        {adminBookingRequestStatusLabel(row.original.status, locale)}
                    </BookingStatusPill>
                    {row.original.publicationStatus === 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' ? (
                        <Badge variant="outline">{adminBookingRequestPublicationStatusLabel(row.original.publicationStatus, locale)}</Badge>
                    ) : null}
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('offerCount', {
            header: () => ({ de: 'Angebote', en: 'Offers' })[locale],
            cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.offerCount}</span>,
            enableSorting: false,
        }),
        columnHelper.accessor('cookName', {
            header: () => ({ de: 'Koch', en: 'Cook' })[locale],
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.cookName ?? { de: '—', en: '—' }[locale]}</span>,
            enableSorting: false,
        }),
    ]);
}

export function adminBookingRequestCustomerLabel(customer: { firstName: string; lastName: string }): string {
    return userDisplayName(customer);
}
